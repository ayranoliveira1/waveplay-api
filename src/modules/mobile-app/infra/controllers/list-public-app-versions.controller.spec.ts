import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ListPublicAppVersionsController } from './list-public-app-versions.controller'
import { ListAppVersionsUseCase } from '../../application/use-cases/list-app-versions-use-case'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let testModule: TestingModule

function makeVersion(
  id: string,
  overrides: Partial<{
    version: string
    publishedAt: Date
    isCurrent: boolean
    releaseNotes: string | null
  }> = {},
) {
  return MobileAppVersion.create(
    {
      version: overrides.version ?? '1.0.0',
      storageKey: `apks/${overrides.version ?? '1.0.0'}.apk`,
      downloadUrl: `https://r2/${overrides.version ?? '1.0.0'}.apk`,
      fileSize: 30_000_000,
      publishedBy: 'admin-1',
      isCurrent: overrides.isCurrent ?? false,
      releaseNotes: overrides.releaseNotes ?? null,
      forceUpdate: false,
      publishedAt: overrides.publishedAt ?? new Date(),
    },
    new UniqueEntityID(id),
  )
}

describe('ListPublicAppVersionsController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ListPublicAppVersionsController],
      providers: [
        ListAppVersionsUseCase,
        {
          provide: MobileAppVersionsRepository,
          useClass: InMemoryMobileAppVersionsRepository,
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = testModule.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
  })

  it('should return 200 with all versions ordered by publishedAt desc', async () => {
    const repo = testModule.get<InMemoryMobileAppVersionsRepository>(
      MobileAppVersionsRepository,
    )

    repo.items.push(
      makeVersion('v1', {
        version: '1.0.0',
        publishedAt: new Date('2026-01-01'),
      }),
      makeVersion('v2', {
        version: '1.0.2',
        publishedAt: new Date('2026-04-01'),
        isCurrent: true,
      }),
      makeVersion('v3', {
        version: '1.0.1',
        publishedAt: new Date('2026-02-01'),
      }),
    )

    const response = await request(app.getHttpServer()).get('/app/versions')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.versions).toHaveLength(3)
    expect(response.body.data.versions[0].version).toBe('1.0.2')
    expect(response.body.data.versions[1].version).toBe('1.0.1')
    expect(response.body.data.versions[2].version).toBe('1.0.0')
  })

  it('should return 200 with empty array when no versions are published', async () => {
    const response = await request(app.getHttpServer()).get('/app/versions')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.versions).toEqual([])
  })

  it('should expose only public fields for each version', async () => {
    const repo = testModule.get<InMemoryMobileAppVersionsRepository>(
      MobileAppVersionsRepository,
    )
    repo.items.push(
      makeVersion('v1', {
        version: '1.0.0',
        isCurrent: true,
        releaseNotes: 'Initial release',
      }),
    )

    const response = await request(app.getHttpServer()).get('/app/versions')
    const item = response.body.data.versions[0]

    expect(item).toMatchObject({
      version: '1.0.0',
      forceUpdate: false,
      releaseNotes: 'Initial release',
      isCurrent: true,
    })
    expect(item.downloadUrl).toBeDefined()
    expect(item.publishedAt).toBeDefined()
  })

  it('should NOT expose sensitive fields (id, fileSize, publishedBy, storageKey)', async () => {
    const repo = testModule.get<InMemoryMobileAppVersionsRepository>(
      MobileAppVersionsRepository,
    )
    repo.items.push(makeVersion('v1', { version: '1.0.0' }))

    const response = await request(app.getHttpServer()).get('/app/versions')
    const item = response.body.data.versions[0]

    expect(item.id).toBeUndefined()
    expect(item.fileSize).toBeUndefined()
    expect(item.publishedBy).toBeUndefined()
    expect(item.storageKey).toBeUndefined()
  })

  it('should mark isCurrent correctly across the list', async () => {
    const repo = testModule.get<InMemoryMobileAppVersionsRepository>(
      MobileAppVersionsRepository,
    )

    repo.items.push(
      makeVersion('v1', {
        version: '1.0.0',
        publishedAt: new Date('2026-01-01'),
      }),
      makeVersion('v2', {
        version: '1.0.1',
        publishedAt: new Date('2026-02-01'),
        isCurrent: true,
      }),
    )

    const response = await request(app.getHttpServer()).get('/app/versions')
    const versions = response.body.data.versions as Array<{
      version: string
      isCurrent: boolean
    }>

    const current = versions.find((v) => v.isCurrent)
    const older = versions.filter((v) => !v.isCurrent)

    expect(current?.version).toBe('1.0.1')
    expect(older).toHaveLength(1)
    expect(older[0].version).toBe('1.0.0')
  })
})
