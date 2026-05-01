import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ThrottlerStorage } from '@nestjs/throttler'
import request from 'supertest'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { hash } from 'argon2'

import { AppModule } from '@/app.module'
import { EmailSenderPort } from '@/shared/email/email-sender.port'
import { FakeEmailSender } from 'test/ports/fake-email-sender'
import { ObjectStoragePort } from '@/modules/mobile-app/application/ports/object-storage.port'
import { FakeObjectStorage } from 'test/ports/fake-object-storage'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { PrismaService } from '@/shared/database/prisma.service'
import { authHeader } from './helpers/e2e-helpers'

let app: INestApplication
let adminToken: string
let storage: FakeObjectStorage

const noOpThrottlerStorage = {
  storage: new Map(),
  increment: async () => ({
    totalHits: 0,
    timeToExpire: 0,
    isBlocked: false,
    timeToBlockExpire: 0,
  }),
}

async function loginAsAdmin(app: INestApplication): Promise<string> {
  const prisma = app.get(PrismaService)
  const passwordHash = await hash('Admin@123', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    type: 2,
  })

  await prisma.user.upsert({
    where: { email: 'admin@waveplay.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@waveplay.com',
      passwordHash,
      role: 'admin',
    },
  })

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .set('X-Platform', 'mobile')
    .send({ email: 'admin@waveplay.com', password: 'Admin@123' })

  return response.body.data.accessToken
}

beforeAll(async () => {
  storage = new FakeObjectStorage()

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailSenderPort)
    .useValue(new FakeEmailSender())
    .overrideProvider(ObjectStoragePort)
    .useValue(storage)
    .overrideProvider(ThrottlerStorage)
    .useValue(noOpThrottlerStorage)
    .compile()

  app = moduleRef.createNestApplication()
  app.use(helmet())
  app.use(cookieParser())
  app.useGlobalFilters(new AllExceptionsFilter())
  await app.init()

  const prisma = app.get(PrismaService)
  await prisma.mobileAppVersion.deleteMany({})

  adminToken = await loginAsAdmin(app)
})

afterAll(async () => {
  await app.close()
})

describe('Mobile App Distribution — E2E', () => {
  describe('GET /app/version (no version yet)', () => {
    it('should return 404 when no version is registered', async () => {
      const response = await request(app.getHttpServer()).get('/app/version')
      expect(response.status).toBe(404)
    })
  })

  describe('POST /admin/app-versions/upload-url', () => {
    it('should return a presigned URL for valid semver', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/app-versions/upload-url')
        .set(authHeader(adminToken))
        .send({ version: '1.0.0' })

      expect(response.status).toBe(200)
      expect(response.body.data.uploadUrl).toContain('fake-r2.test')
      expect(response.body.data.storageKey).toBe('apks/1.0.0.apk')
      expect(response.body.data.expiresAt).toBeDefined()
    })

    it('should return 400 for invalid semver', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/app-versions/upload-url')
        .set(authHeader(adminToken))
        .send({ version: '1.0' })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /admin/app-versions', () => {
    it('should register version metadata after upload', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/app-versions')
        .set(authHeader(adminToken))
        .send({
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          fileSize: 30_000_000,
          releaseNotes: 'Versao inicial',
          forceUpdate: false,
        })

      expect(response.status).toBe(201)
      expect(response.body.data.version).toMatchObject({
        version: '1.0.0',
        fileSize: 30_000_000,
        releaseNotes: 'Versao inicial',
        forceUpdate: false,
        isCurrent: false,
      })

      const prisma = app.get(PrismaService)
      const stored = await prisma.mobileAppVersion.findUnique({
        where: { version: '1.0.0' },
      })
      expect(stored).not.toBeNull()
      expect(stored!.fileSize).toBe(30_000_000)
    })

    it('should return 409 for duplicate version', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/app-versions')
        .set(authHeader(adminToken))
        .send({
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          fileSize: 30_000_000,
        })

      expect(response.status).toBe(409)
    })

    it('should accept prerelease versions', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/app-versions')
        .set(authHeader(adminToken))
        .send({
          version: '1.0.1-beta.1',
          storageKey: 'apks/1.0.1-beta.1.apk',
          fileSize: 31_000_000,
        })

      expect(response.status).toBe(201)
    })
  })

  describe('PATCH /admin/app-versions/:id/current', () => {
    it('should promote a version to current and unmark others', async () => {
      const prisma = app.get(PrismaService)

      const v100 = await prisma.mobileAppVersion.findUnique({
        where: { version: '1.0.0' },
      })
      const vBeta = await prisma.mobileAppVersion.findUnique({
        where: { version: '1.0.1-beta.1' },
      })

      // Promove 1.0.0 primeiro
      await request(app.getHttpServer())
        .patch(`/admin/app-versions/${v100!.id}/current`)
        .set(authHeader(adminToken))

      // Agora promove 1.0.1-beta.1
      const response = await request(app.getHttpServer())
        .patch(`/admin/app-versions/${vBeta!.id}/current`)
        .set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(response.body.data.version.isCurrent).toBe(true)

      const v100After = await prisma.mobileAppVersion.findUnique({
        where: { id: v100!.id },
      })
      expect(v100After!.isCurrent).toBe(false)
    })

    it('should return 404 for nonexistent id', async () => {
      const response = await request(app.getHttpServer())
        .patch(
          '/admin/app-versions/99999999-9999-4999-8999-999999999999/current',
        )
        .set(authHeader(adminToken))
      expect(response.status).toBe(404)
    })
  })

  describe('GET /app/version (after current is set)', () => {
    it('should return public shape without auth', async () => {
      const response = await request(app.getHttpServer()).get('/app/version')

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({
        version: '1.0.1-beta.1',
        forceUpdate: false,
      })
      expect(response.body.data.downloadUrl).toBeDefined()
      // Nao vaza campos internos
      expect(response.body.data.id).toBeUndefined()
      expect(response.body.data.storageKey).toBeUndefined()
      expect(response.body.data.publishedBy).toBeUndefined()
      expect(response.body.data.fileSize).toBeUndefined()
    })
  })

  describe('GET /admin/app-versions', () => {
    it('should list all versions for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/app-versions')
        .set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(response.body.data.versions.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('GET /app/versions (public history)', () => {
    it('should list all versions ordered by publishedAt desc without auth', async () => {
      const response = await request(app.getHttpServer()).get('/app/versions')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.versions)).toBe(true)
      expect(response.body.data.versions.length).toBeGreaterThanOrEqual(2)

      const dates = (
        response.body.data.versions as Array<{ publishedAt: string }>
      ).map((v) => new Date(v.publishedAt).getTime())
      const sorted = [...dates].sort((a, b) => b - a)
      expect(dates).toEqual(sorted)
    })

    it('should mark isCurrent: true on the actual current version only', async () => {
      const response = await request(app.getHttpServer()).get('/app/versions')
      const currents = (
        response.body.data.versions as Array<{ isCurrent: boolean }>
      ).filter((v) => v.isCurrent)

      expect(currents).toHaveLength(1)
    })

    it('should not require authentication', async () => {
      const response = await request(app.getHttpServer()).get('/app/versions')
      expect(response.status).toBe(200)
    })

    it('should not expose sensitive fields (id, fileSize, publishedBy, storageKey)', async () => {
      const response = await request(app.getHttpServer()).get('/app/versions')
      const items = response.body.data.versions as Array<
        Record<string, unknown>
      >

      for (const item of items) {
        expect(item.id).toBeUndefined()
        expect(item.fileSize).toBeUndefined()
        expect(item.publishedBy).toBeUndefined()
        expect(item.storageKey).toBeUndefined()
      }
    })
  })

  describe('DELETE /admin/app-versions/:id', () => {
    it('should return 409 when trying to delete the current version', async () => {
      const prisma = app.get(PrismaService)
      const current = await prisma.mobileAppVersion.findFirst({
        where: { isCurrent: true },
      })

      const response = await request(app.getHttpServer())
        .delete(`/admin/app-versions/${current!.id}`)
        .set(authHeader(adminToken))

      expect(response.status).toBe(409)
    })

    it('should delete a non-current version and remove storage object', async () => {
      const prisma = app.get(PrismaService)
      const nonCurrent = await prisma.mobileAppVersion.findFirst({
        where: { isCurrent: false },
      })
      const initialDeletedCount = storage.deletedKeys.length

      const response = await request(app.getHttpServer())
        .delete(`/admin/app-versions/${nonCurrent!.id}`)
        .set(authHeader(adminToken))

      expect(response.status).toBe(204)
      expect(storage.deletedKeys.length).toBe(initialDeletedCount + 1)

      const stored = await prisma.mobileAppVersion.findUnique({
        where: { id: nonCurrent!.id },
      })
      expect(stored).toBeNull()
    })
  })

  describe('Authorization', () => {
    it('should return 401 without auth on admin endpoints', async () => {
      const response = await request(app.getHttpServer()).get(
        '/admin/app-versions',
      )
      expect(response.status).toBe(401)
    })
  })
})
