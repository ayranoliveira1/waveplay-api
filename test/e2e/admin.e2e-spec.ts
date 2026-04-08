import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './helpers/e2e-app'
import { registerUser, authHeader, fullCleanup } from './helpers/e2e-helpers'
import { PrismaService } from '@/shared/database/prisma.service'
import { hash } from 'argon2'

let app: INestApplication
let adminToken: string

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
  const e2e = await createE2EApp()
  app = e2e.app
  await fullCleanup(app)
  adminToken = await loginAsAdmin(app)
})

afterAll(async () => {
  await app.close()
})

// ---------------------------------------------------------------------------
// GET /admin/analytics
// ---------------------------------------------------------------------------

describe('GET /admin/analytics', () => {
  it('should return 200 with overview and period for admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/analytics')
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.error).toBeNull()

    const { overview, period } = response.body.data
    expect(overview).toBeDefined()
    expect(overview.totalUsers).toBeGreaterThanOrEqual(1) // admin user exists
    expect(overview.totalActiveSubscriptions).toBeDefined()
    expect(overview.subscriptionsByPlan).toBeDefined()
    expect(overview.activeStreams).toBeDefined()
    expect(overview.estimatedMonthlyRevenue).toBeDefined()
    expect(overview.profileDistribution).toBeDefined()
    expect(overview.profilesByType).toBeDefined()

    expect(period).toBeDefined()
    expect(period.registrationsByDay).toBeDefined()
    expect(period.cumulativeUsers).toBeDefined()
    expect(period.activeUsers).toBeDefined()
    expect(period.topContent).toBeDefined()
    expect(period.streamsByHour).toBeDefined()
    expect(period.totalStreamSessions).toBeDefined()
    expect(period.avgStreamDuration).toBeDefined()
  })

  it('should reflect registered users in overview.totalUsers', async () => {
    await registerUser(app)
    await registerUser(app)

    const response = await request(app.getHttpServer())
      .get('/admin/analytics')
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)
    // admin + at least 2 registered users
    expect(response.body.data.overview.totalUsers).toBeGreaterThanOrEqual(3)
  })

  it('should accept startDate and endDate query params', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/analytics')
      .query({ startDate: '2026-01-01', endDate: '2026-12-31' })
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  })

  it('should return 401 without authentication', async () => {
    const response = await request(app.getHttpServer()).get('/admin/analytics')

    expect(response.status).toBe(401)
  })

  it('should return 403 for non-admin user', async () => {
    const { accessToken } = await registerUser(app)

    const response = await request(app.getHttpServer())
      .get('/admin/analytics')
      .set(authHeader(accessToken!))

    expect(response.status).toBe(403)
  })
})
