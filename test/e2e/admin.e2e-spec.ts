import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './helpers/e2e-app'
import {
  registerUser,
  loginUser,
  authHeader,
  fullCleanup,
  uniqueEmail,
  getFirstProfileId,
} from './helpers/e2e-helpers'
import { PrismaService } from '@/shared/database/prisma.service'
import { hash } from 'argon2'

let app: INestApplication
let adminToken: string
let basicoPlanId: string
let padraoPlanId: string
let premiumPlanId: string

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

  const prisma = app.get(PrismaService)
  const plans = await prisma.plan.findMany({
    where: { slug: { in: ['basico', 'padrao', 'premium'] } },
  })
  basicoPlanId = plans.find((p) => p.slug === 'basico')!.id
  padraoPlanId = plans.find((p) => p.slug === 'padrao')!.id
  premiumPlanId = plans.find((p) => p.slug === 'premium')!.id
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

// ---------------------------------------------------------------------------
// POST /admin/users
// ---------------------------------------------------------------------------

describe('POST /admin/users', () => {
  it('should return 201 and create user with specific plan', async () => {
    const email = uniqueEmail('admin-create')

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Created User',
        email,
        password: 'SenhaForte1',
        planId: premiumPlanId,
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toMatchObject({
      name: 'Created User',
      email,
      role: 'user',
    })
    expect(response.body.data.passwordHash).toBeUndefined()
  })

  it('should persist user + subscription + profile via Prisma', async () => {
    const email = uniqueEmail('admin-create-persist')

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Persisted User',
        email,
        password: 'SenhaForte1',
        planId: padraoPlanId,
      })

    expect(response.status).toBe(201)

    const prisma = app.get(PrismaService)
    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: {
        subscriptions: { where: { status: 'active' }, include: { plan: true } },
        profiles: true,
      },
    })

    expect(dbUser).not.toBeNull()
    expect(dbUser!.subscriptions).toHaveLength(1)
    expect(dbUser!.subscriptions[0].plan.slug).toBe('padrao')
    expect(dbUser!.profiles).toHaveLength(1)
    expect(dbUser!.profiles[0].name).toBe('Persisted User')
  })

  it('should return 409 when email already exists', async () => {
    const email = uniqueEmail('admin-dup')

    await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'First',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Second',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })

    expect(response.status).toBe(409)
  })

  it('should return 400 for weak password', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Weak',
        email: uniqueEmail('weak'),
        password: 'weakpass',
        planId: basicoPlanId,
      })

    expect(response.status).toBe(400)
  })

  it('should return 404 when planId is a valid UUID but does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'NoPlan',
        email: uniqueEmail('noplan'),
        password: 'SenhaForte1',
        planId: '99999999-9999-4999-8999-999999999999',
      })

    expect(response.status).toBe(404)
  })

  it('should return 400 with extra field (strict mode)', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Strict',
        email: uniqueEmail('strict'),
        password: 'SenhaForte1',
        planId: basicoPlanId,
        role: 'admin',
      })

    expect(response.status).toBe(400)
  })

  it('should return 401/403 for unauthenticated or non-admin request', async () => {
    const noAuth = await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        name: 'X',
        email: uniqueEmail('noauth'),
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerUser(app)
    const asUser = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(accessToken!))
      .send({
        name: 'Y',
        email: uniqueEmail('asuser'),
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    expect(asUser.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// GET /admin/users
// ---------------------------------------------------------------------------

describe('GET /admin/users', () => {
  it('should return 200 with paginated shape and profilesCount', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/users')
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.users).toBeDefined()
    expect(response.body.data.page).toBeDefined()
    expect(response.body.data.totalPages).toBeDefined()
    expect(response.body.data.totalItems).toBeGreaterThanOrEqual(1)
    expect(response.body.data.users[0].profilesCount).toBeDefined()
  })

  it('should filter by search (case-insensitive)', async () => {
    const email = uniqueEmail('search-target')
    await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Searchable Person',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })

    const response = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ search: 'SEARCHABLE' })
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)
    expect(
      response.body.data.users.some(
        (u: { email: string }) => u.email === email,
      ),
    ).toBe(true)
  })

  it('should use defaults page=1 perPage=20', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/users')
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data.page).toBe(1)
    expect(response.body.data.users.length).toBeLessThanOrEqual(20)
  })

  it('should return 400 when perPage > 100', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ perPage: '101' })
      .set(authHeader(adminToken))

    expect(response.status).toBe(400)
  })

  it('should return 401/403 for unauthenticated or non-admin', async () => {
    const noAuth = await request(app.getHttpServer()).get('/admin/users')
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerUser(app)
    const asUser = await request(app.getHttpServer())
      .get('/admin/users')
      .set(authHeader(accessToken!))
    expect(asUser.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// GET /admin/users/:id
// ---------------------------------------------------------------------------

describe('GET /admin/users/:id', () => {
  it('should return 200 with subscription plan and profiles', async () => {
    const email = uniqueEmail('detail-target')

    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Detail User',
        email,
        password: 'SenhaForte1',
        planId: premiumPlanId,
      })

    const userId = createResponse.body.data.id

    const response = await request(app.getHttpServer())
      .get(`/admin/users/${userId}`)
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe(userId)
    expect(response.body.data.subscription.plan.slug).toBe('premium')
    expect(response.body.data.profiles).toHaveLength(1)
  })

  it('should return 404 when UUID is valid but user does not exist', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/users/00000000-0000-4000-8000-000000000000')
      .set(authHeader(adminToken))

    expect(response.status).toBe(404)
  })

  it('should return 400 for invalid UUID', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/users/not-a-uuid')
      .set(authHeader(adminToken))

    expect(response.status).toBe(400)
  })

  it('should return 401/403 for unauthenticated or non-admin', async () => {
    const fakeId = '11111111-1111-4111-8111-111111111111'

    const noAuth = await request(app.getHttpServer()).get(
      `/admin/users/${fakeId}`,
    )
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerUser(app)
    const asUser = await request(app.getHttpServer())
      .get(`/admin/users/${fakeId}`)
      .set(authHeader(accessToken!))
    expect(asUser.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// PATCH /admin/users/:id
// ---------------------------------------------------------------------------

describe('PATCH /admin/users/:id', () => {
  it('should return 200 and update the name', async () => {
    const email = uniqueEmail('update-user-name')
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Original Name',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}`)
      .set(authHeader(adminToken))
      .send({ name: 'Updated Name' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.user).toMatchObject({
      id: userId,
      name: 'Updated Name',
      email,
      role: 'user',
      active: true,
    })
    expect(response.body.data.user.createdAt).toBeDefined()
    expect(response.body.data.user.updatedAt).toBeDefined()
  })

  it('should return 200 and persist the new email via Prisma', async () => {
    const email = uniqueEmail('update-user-email')
    const newEmail = uniqueEmail('update-user-email-new')

    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Email User',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}`)
      .set(authHeader(adminToken))
      .send({ email: newEmail })

    expect(response.status).toBe(200)
    expect(response.body.data.user.email).toBe(newEmail)

    const prisma = app.get(PrismaService)
    const dbUser = await prisma.user.findUnique({ where: { id: userId } })
    expect(dbUser!.email).toBe(newEmail)
  })

  it('should return 409 when email conflicts with another user', async () => {
    const firstEmail = uniqueEmail('update-user-conflict-a')
    const secondEmail = uniqueEmail('update-user-conflict-b')

    await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'User A',
        email: firstEmail,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })

    const secondResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'User B',
        email: secondEmail,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    const secondUserId = secondResponse.body.data.id

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${secondUserId}`)
      .set(authHeader(adminToken))
      .send({ email: firstEmail })

    expect(response.status).toBe(409)
  })

  it('should return 404 when userId does not exist', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/users/99999999-9999-4999-8999-999999999999')
      .set(authHeader(adminToken))
      .send({ name: 'Ghost' })

    expect(response.status).toBe(404)
  })

  it('should return 401 without auth header', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/users/11111111-1111-4111-8111-111111111111')
      .send({ name: 'NoAuth' })

    expect(response.status).toBe(401)
  })

  it('should return 403 when caller is non-admin user', async () => {
    const { accessToken } = await registerUser(app)
    const response = await request(app.getHttpServer())
      .patch('/admin/users/11111111-1111-4111-8111-111111111111')
      .set(authHeader(accessToken!))
      .send({ name: 'Forbidden' })

    expect(response.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// PATCH /admin/users/:id/subscription
// ---------------------------------------------------------------------------

describe('PATCH /admin/users/:id/subscription', () => {
  it('should update subscription from basico to premium', async () => {
    const email = uniqueEmail('patch-update')
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Patch Update',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/subscription`)
      .set(authHeader(adminToken))
      .send({ planId: premiumPlanId })

    expect(response.status).toBe(200)
    expect(response.body.data.subscription.planId).toBe(premiumPlanId)
    expect(response.body.data.warning).toBeNull()
  })

  it('should create subscription when user has none (after deletion)', async () => {
    const email = uniqueEmail('patch-create')
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Patch Create',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    const prisma = app.get(PrismaService)
    await prisma.subscription.deleteMany({ where: { userId } })

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/subscription`)
      .set(authHeader(adminToken))
      .send({ planId: premiumPlanId })

    expect(response.status).toBe(200)
    expect(response.body.data.subscription.planId).toBe(premiumPlanId)

    const subs = await prisma.subscription.findMany({ where: { userId } })
    expect(subs).toHaveLength(1)
  })

  it('should return warning on downgrade and keep profiles intact', async () => {
    const email = uniqueEmail('patch-downgrade')
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Patch Downgrade',
        email,
        password: 'SenhaForte1',
        planId: premiumPlanId,
      })
    const userId = createResponse.body.data.id

    const prisma = app.get(PrismaService)
    await prisma.profile.createMany({
      data: [
        { userId, name: 'Extra 1' },
        { userId, name: 'Extra 2' },
        { userId, name: 'Extra 3' },
      ],
    })

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/subscription`)
      .set(authHeader(adminToken))
      .send({ planId: basicoPlanId })

    expect(response.status).toBe(200)
    expect(response.body.data.warning).toContain('4 perfis')
    expect(response.body.data.warning).toContain('apenas 1')

    const remainingProfiles = await prisma.profile.count({ where: { userId } })
    expect(remainingProfiles).toBe(4)
  })

  it('should return 404 when user does not exist', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/users/00000000-0000-4000-8000-000000000000/subscription')
      .set(authHeader(adminToken))
      .send({ planId: basicoPlanId })

    expect(response.status).toBe(404)
  })

  it('should return 404 when plan does not exist', async () => {
    const email = uniqueEmail('patch-missing-plan')
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Patch Missing Plan',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/subscription`)
      .set(authHeader(adminToken))
      .send({ planId: '99999999-9999-4999-8999-999999999999' })

    expect(response.status).toBe(404)
  })

  it('should return 401/403 for unauthenticated or non-admin', async () => {
    const fakeId = '11111111-1111-4111-8111-111111111111'

    const noAuth = await request(app.getHttpServer())
      .patch(`/admin/users/${fakeId}/subscription`)
      .send({ planId: basicoPlanId })
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerUser(app)
    const asUser = await request(app.getHttpServer())
      .patch(`/admin/users/${fakeId}/subscription`)
      .set(authHeader(accessToken!))
      .send({ planId: basicoPlanId })
    expect(asUser.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// GET /admin/plans
// ---------------------------------------------------------------------------

describe('GET /admin/plans', () => {
  it('should return 200 with seed plans and correct shape', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/plans')
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.error).toBeNull()

    const { plans } = response.body.data
    expect(plans.length).toBeGreaterThanOrEqual(3)

    const basico = plans.find((p: { slug: string }) => p.slug === 'basico')
    expect(basico).toBeDefined()
    expect(basico).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      slug: 'basico',
      priceCents: expect.any(Number),
      maxProfiles: expect.any(Number),
      maxStreams: expect.any(Number),
      active: true,
    })
  })

  it('should include inactive plans in the response', async () => {
    const slug = `test-plan-list-inactive-${Date.now()}`

    // create plan
    const createResponse = await request(app.getHttpServer())
      .post('/admin/plans')
      .set(authHeader(adminToken))
      .send({
        name: 'List Inactive',
        slug,
        priceCents: 990,
        maxProfiles: 1,
        maxStreams: 1,
      })
    const planId = createResponse.body.data.plan.id

    // deactivate
    await request(app.getHttpServer())
      .patch(`/admin/plans/${planId}/toggle`)
      .set(authHeader(adminToken))
      .send()

    // list should include it with active=false
    const response = await request(app.getHttpServer())
      .get('/admin/plans')
      .set(authHeader(adminToken))

    const found = response.body.data.plans.find(
      (p: { slug: string }) => p.slug === slug,
    )
    expect(found).toBeDefined()
    expect(found.active).toBe(false)

    // cleanup
    const prisma = app.get(PrismaService)
    await prisma.plan.deleteMany({ where: { slug } })
  })

  it('should return 401 without authentication', async () => {
    const response = await request(app.getHttpServer()).get('/admin/plans')

    expect(response.status).toBe(401)
  })

  it('should return 403 for non-admin user', async () => {
    const { accessToken } = await registerUser(app)

    const response = await request(app.getHttpServer())
      .get('/admin/plans')
      .set(authHeader(accessToken!))

    expect(response.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// POST /admin/plans
// ---------------------------------------------------------------------------

describe('POST /admin/plans', () => {
  afterAll(async () => {
    const prisma = app.get(PrismaService)
    await prisma.plan.deleteMany({
      where: { slug: { startsWith: 'test-plan-' } },
    })
  })

  it('should return 201 and create a plan with active=true', async () => {
    const slug = `test-plan-create-${Date.now()}`
    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .set(authHeader(adminToken))
      .send({
        name: 'Test Plan Create',
        slug,
        priceCents: 4990,
        maxProfiles: 6,
        maxStreams: 5,
        description: 'Plano de teste',
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.plan).toMatchObject({
      id: expect.any(String),
      name: 'Test Plan Create',
      slug,
      priceCents: 4990,
      maxProfiles: 6,
      maxStreams: 5,
      description: 'Plano de teste',
      active: true,
    })
  })

  it('should persist the plan in the database', async () => {
    const slug = `test-plan-persist-${Date.now()}`
    await request(app.getHttpServer())
      .post('/admin/plans')
      .set(authHeader(adminToken))
      .send({
        name: 'Test Plan Persist',
        slug,
        priceCents: 5990,
        maxProfiles: 7,
        maxStreams: 6,
      })

    const prisma = app.get(PrismaService)
    const stored = await prisma.plan.findUnique({ where: { slug } })
    expect(stored).not.toBeNull()
    expect(stored?.active).toBe(true)
    expect(stored?.priceCents).toBe(5990)
  })

  it('should return 409 when slug already exists', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .set(authHeader(adminToken))
      .send({
        name: 'Duplicado',
        slug: 'basico',
        priceCents: 1990,
        maxProfiles: 3,
        maxStreams: 2,
      })

    expect(response.status).toBe(409)
  })

  it('should return 400 when slug has invalid characters', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .set(authHeader(adminToken))
      .send({
        name: 'Test',
        slug: 'Invalid!',
        priceCents: 1990,
        maxProfiles: 3,
        maxStreams: 2,
      })

    expect(response.status).toBe(400)
  })

  it('should return 400 when body has extra field (strict mode)', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .set(authHeader(adminToken))
      .send({
        name: 'Test',
        slug: `test-plan-strict-${Date.now()}`,
        priceCents: 1990,
        maxProfiles: 3,
        maxStreams: 2,
        active: false,
      })

    expect(response.status).toBe(400)
  })

  it('should return 401/403 for unauthenticated or non-admin', async () => {
    const payload = {
      name: 'Test',
      slug: `test-plan-auth-${Date.now()}`,
      priceCents: 1990,
      maxProfiles: 3,
      maxStreams: 2,
    }

    const noAuth = await request(app.getHttpServer())
      .post('/admin/plans')
      .send(payload)
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerUser(app)
    const asUser = await request(app.getHttpServer())
      .post('/admin/plans')
      .set(authHeader(accessToken!))
      .send(payload)
    expect(asUser.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// PATCH /admin/plans/:id
// ---------------------------------------------------------------------------

describe('PATCH /admin/plans/:id', () => {
  afterAll(async () => {
    const prisma = app.get(PrismaService)
    await prisma.plan.deleteMany({
      where: { slug: { startsWith: 'test-plan-' } },
    })
  })

  async function createTestPlan(slug: string) {
    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .set(authHeader(adminToken))
      .send({
        name: 'Inicial',
        slug,
        priceCents: 1990,
        maxProfiles: 3,
        maxStreams: 2,
        description: 'Descrição inicial',
      })
    return response.body.data.plan.id as string
  }

  it('should update name + priceCents and persist to database', async () => {
    const planId = await createTestPlan(`test-plan-update-${Date.now()}`)

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${planId}`)
      .set(authHeader(adminToken))
      .send({ name: 'Atualizado', priceCents: 2490 })

    expect(response.status).toBe(200)
    expect(response.body.data.plan).toMatchObject({
      id: planId,
      name: 'Atualizado',
      priceCents: 2490,
      maxProfiles: 3,
      maxStreams: 2,
    })

    const prisma = app.get(PrismaService)
    const stored = await prisma.plan.findUnique({ where: { id: planId } })
    expect(stored?.name).toBe('Atualizado')
    expect(stored?.priceCents).toBe(2490)
  })

  it('should partial-update (only priceCents) preserving other fields', async () => {
    const planId = await createTestPlan(`test-plan-partial-${Date.now()}`)

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${planId}`)
      .set(authHeader(adminToken))
      .send({ priceCents: 9990 })

    expect(response.status).toBe(200)
    expect(response.body.data.plan).toMatchObject({
      name: 'Inicial',
      priceCents: 9990,
      maxProfiles: 3,
      maxStreams: 2,
      description: 'Descrição inicial',
    })
  })

  it('should return 404 when planId does not exist', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/plans/00000000-0000-4000-8000-000000000000')
      .set(authHeader(adminToken))
      .send({ priceCents: 2490 })

    expect(response.status).toBe(404)
  })

  it('should return 400 when body has extra field (strict mode)', async () => {
    const planId = await createTestPlan(`test-plan-strictup-${Date.now()}`)

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${planId}`)
      .set(authHeader(adminToken))
      .send({ priceCents: 2490, slug: 'hacked' })

    expect(response.status).toBe(400)
  })

  it('should return 401/403 for unauthenticated or non-admin', async () => {
    const fakeId = '11111111-1111-4111-8111-111111111111'

    const noAuth = await request(app.getHttpServer())
      .patch(`/admin/plans/${fakeId}`)
      .send({ priceCents: 2490 })
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerUser(app)
    const asUser = await request(app.getHttpServer())
      .patch(`/admin/plans/${fakeId}`)
      .set(authHeader(accessToken!))
      .send({ priceCents: 2490 })
    expect(asUser.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// PATCH /admin/plans/:id/toggle
// ---------------------------------------------------------------------------

describe('PATCH /admin/plans/:id/toggle', () => {
  afterAll(async () => {
    const prisma = app.get(PrismaService)
    await prisma.plan.deleteMany({
      where: { slug: { startsWith: 'test-plan-' } },
    })
  })

  async function createTestPlan(slug: string) {
    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .set(authHeader(adminToken))
      .send({
        name: 'Toggle Plan',
        slug,
        priceCents: 1990,
        maxProfiles: 3,
        maxStreams: 2,
      })
    return response.body.data.plan.id as string
  }

  it('should deactivate an active plan and persist to database', async () => {
    const planId = await createTestPlan(`test-plan-toggle-off-${Date.now()}`)

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${planId}/toggle`)
      .set(authHeader(adminToken))
      .send()

    expect(response.status).toBe(200)
    expect(response.body.data.plan.active).toBe(false)

    const prisma = app.get(PrismaService)
    const stored = await prisma.plan.findUnique({ where: { id: planId } })
    expect(stored?.active).toBe(false)
  })

  it('should reactivate an inactive plan and persist to database', async () => {
    const planId = await createTestPlan(`test-plan-toggle-on-${Date.now()}`)

    // first deactivate
    await request(app.getHttpServer())
      .patch(`/admin/plans/${planId}/toggle`)
      .set(authHeader(adminToken))
      .send()

    // then reactivate
    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${planId}/toggle`)
      .set(authHeader(adminToken))
      .send()

    expect(response.status).toBe(200)
    expect(response.body.data.plan.active).toBe(true)

    const prisma = app.get(PrismaService)
    const stored = await prisma.plan.findUnique({ where: { id: planId } })
    expect(stored?.active).toBe(true)
  })

  it('should return 404 when planId does not exist', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/plans/00000000-0000-4000-8000-000000000000/toggle')
      .set(authHeader(adminToken))
      .send()

    expect(response.status).toBe(404)
  })

  it('should return 400 when id is not a valid UUID', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/plans/not-a-uuid/toggle')
      .set(authHeader(adminToken))
      .send()

    expect(response.status).toBe(400)
  })

  it('should return 401/403 for unauthenticated or non-admin', async () => {
    const fakeId = '11111111-1111-4111-8111-111111111111'

    const noAuth = await request(app.getHttpServer())
      .patch(`/admin/plans/${fakeId}/toggle`)
      .send()
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerUser(app)
    const asUser = await request(app.getHttpServer())
      .patch(`/admin/plans/${fakeId}/toggle`)
      .set(authHeader(accessToken!))
      .send()
    expect(asUser.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// PATCH /admin/users/:id/deactivate
// ---------------------------------------------------------------------------

describe('PATCH /admin/users/:id/deactivate', () => {
  it('should return 200 and persist active=false in the database', async () => {
    const email = uniqueEmail('deactivate-active')
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'To Deactivate',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/deactivate`)
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.user).toMatchObject({
      id: userId,
      email,
      active: false,
    })

    const prisma = app.get(PrismaService)
    const dbUser = await prisma.user.findUnique({ where: { id: userId } })
    expect(dbUser!.active).toBe(false)
  })

  it('should revoke all refresh tokens of the deactivated user', async () => {
    const email = uniqueEmail('deactivate-tokens')
    const password = 'SenhaForte1'
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Tokens User',
        email,
        password,
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    await loginUser(app, email, password, 'mobile')
    await loginUser(app, email, password, 'mobile')

    const prisma = app.get(PrismaService)
    const tokensBefore = await prisma.refreshToken.findMany({
      where: { userId },
    })
    expect(tokensBefore.length).toBeGreaterThanOrEqual(1)
    expect(tokensBefore.every((t) => t.revokedAt === null)).toBe(true)

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/deactivate`)
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)

    const tokensAfter = await prisma.refreshToken.findMany({
      where: { userId },
    })
    expect(tokensAfter.length).toBe(tokensBefore.length)
    expect(tokensAfter.every((t) => t.revokedAt !== null)).toBe(true)
  })

  it('should delete all active streams of the deactivated user', async () => {
    const email = uniqueEmail('deactivate-streams')
    const password = 'SenhaForte1'
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Streams User',
        email,
        password,
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    const { accessToken } = await loginUser(app, email, password, 'mobile')
    const profileId = await getFirstProfileId(app, accessToken!)

    const prisma = app.get(PrismaService)
    await prisma.activeStream.create({
      data: {
        userId,
        profileId,
        tmdbId: 550,
        type: 'movie',
      },
    })

    const streamsBefore = await prisma.activeStream.findMany({
      where: { userId },
    })
    expect(streamsBefore.length).toBe(1)

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/deactivate`)
      .set(authHeader(adminToken))

    expect(response.status).toBe(200)

    const streamsAfter = await prisma.activeStream.findMany({
      where: { userId },
    })
    expect(streamsAfter.length).toBe(0)
  })

  it('should return 403 when target user is admin (anti-lockout)', async () => {
    const prisma = app.get(PrismaService)
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@waveplay.com' },
    })

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${adminUser!.id}/deactivate`)
      .set(authHeader(adminToken))

    expect(response.status).toBe(403)

    const stillActive = await prisma.user.findUnique({
      where: { id: adminUser!.id },
    })
    expect(stillActive!.active).toBe(true)
  })

  it('should return 404 when userId does not exist', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/users/99999999-9999-4999-8999-999999999999/deactivate')
      .set(authHeader(adminToken))

    expect(response.status).toBe(404)
  })

  it('should return 401/403 for unauthenticated or non-admin', async () => {
    const fakeId = '11111111-1111-4111-8111-111111111111'

    const noAuth = await request(app.getHttpServer()).patch(
      `/admin/users/${fakeId}/deactivate`,
    )
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerUser(app)
    const asUser = await request(app.getHttpServer())
      .patch(`/admin/users/${fakeId}/deactivate`)
      .set(authHeader(accessToken!))
    expect(asUser.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// DELETE /admin/users/:id
// ---------------------------------------------------------------------------

describe('DELETE /admin/users/:id', () => {
  async function createAndDeactivateUser(prefix: string): Promise<string> {
    const email = uniqueEmail(prefix)
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'To Delete',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/deactivate`)
      .set(authHeader(adminToken))

    return userId
  }

  it('should return 204 and hard delete an inactive user', async () => {
    const userId = await createAndDeactivateUser('delete-ok')

    const response = await request(app.getHttpServer())
      .delete(`/admin/users/${userId}`)
      .set(authHeader(adminToken))

    expect(response.status).toBe(204)
    expect(response.body).toEqual({})

    const prisma = app.get(PrismaService)
    const dbUser = await prisma.user.findUnique({ where: { id: userId } })
    expect(dbUser).toBeNull()
  })

  it('should cascade delete profiles, subscriptions and refresh tokens', async () => {
    const email = uniqueEmail('delete-cascade')
    const password = 'SenhaForte1'
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Cascade User',
        email,
        password,
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    await loginUser(app, email, password, 'mobile')

    await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/deactivate`)
      .set(authHeader(adminToken))

    const prisma = app.get(PrismaService)
    const profilesBefore = await prisma.profile.findMany({ where: { userId } })
    const subscriptionsBefore = await prisma.subscription.findMany({
      where: { userId },
    })
    const tokensBefore = await prisma.refreshToken.findMany({
      where: { userId },
    })
    expect(profilesBefore.length).toBeGreaterThanOrEqual(1)
    expect(subscriptionsBefore.length).toBeGreaterThanOrEqual(1)
    expect(tokensBefore.length).toBeGreaterThanOrEqual(1)

    const response = await request(app.getHttpServer())
      .delete(`/admin/users/${userId}`)
      .set(authHeader(adminToken))

    expect(response.status).toBe(204)

    const profilesAfter = await prisma.profile.findMany({ where: { userId } })
    const subscriptionsAfter = await prisma.subscription.findMany({
      where: { userId },
    })
    const tokensAfter = await prisma.refreshToken.findMany({
      where: { userId },
    })
    expect(profilesAfter).toHaveLength(0)
    expect(subscriptionsAfter).toHaveLength(0)
    expect(tokensAfter).toHaveLength(0)
  })

  it('should return 409 when user is still active', async () => {
    const email = uniqueEmail('delete-active')
    const createResponse = await request(app.getHttpServer())
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        name: 'Still Active',
        email,
        password: 'SenhaForte1',
        planId: basicoPlanId,
      })
    const userId = createResponse.body.data.id

    const response = await request(app.getHttpServer())
      .delete(`/admin/users/${userId}`)
      .set(authHeader(adminToken))

    expect(response.status).toBe(409)

    const prisma = app.get(PrismaService)
    const dbUser = await prisma.user.findUnique({ where: { id: userId } })
    expect(dbUser).not.toBeNull()
  })

  it('should return 404 when user does not exist', async () => {
    const response = await request(app.getHttpServer())
      .delete('/admin/users/99999999-9999-4999-8999-999999999999')
      .set(authHeader(adminToken))

    expect(response.status).toBe(404)
  })

  it('should return 403 when target user is admin', async () => {
    const prisma = app.get(PrismaService)
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@waveplay.com' },
    })

    const response = await request(app.getHttpServer())
      .delete(`/admin/users/${adminUser!.id}`)
      .set(authHeader(adminToken))

    expect(response.status).toBe(403)

    const stillExists = await prisma.user.findUnique({
      where: { id: adminUser!.id },
    })
    expect(stillExists).not.toBeNull()
  })

  it('should return 401/403 for unauthenticated or non-admin', async () => {
    const fakeId = '11111111-1111-4111-8111-111111111111'

    const noAuth = await request(app.getHttpServer()).delete(
      `/admin/users/${fakeId}`,
    )
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerUser(app)
    const asUser = await request(app.getHttpServer())
      .delete(`/admin/users/${fakeId}`)
      .set(authHeader(accessToken!))
    expect(asUser.status).toBe(403)
  })
})
