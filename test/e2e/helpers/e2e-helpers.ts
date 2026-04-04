import type { INestApplication } from '@nestjs/common'
import type { Response } from 'supertest'
import request from 'supertest'
import { PrismaService } from '@/shared/database/prisma.service'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import type Redis from 'ioredis'

interface AuthResult {
  response: Response
  email: string
  password: string
  userId: string | undefined
  accessToken: string | undefined
  refreshToken: string | undefined
}

interface LoginResult {
  response: Response
  accessToken: string | undefined
  refreshToken: string | undefined
}

let emailCounter = 0

export function uniqueEmail(prefix = 'user') {
  emailCounter++
  return `${prefix}-${Date.now()}-${emailCounter}@test.com`
}

export async function registerUser(
  app: INestApplication,
  overrides: Partial<{
    name: string
    email: string
    password: string
    confirmPassword: string
  }> = {},
): Promise<AuthResult> {
  const email = overrides.email ?? uniqueEmail()
  const password = overrides.password ?? 'Test1234'

  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .set('X-Platform', 'mobile')
    .send({
      name: overrides.name ?? 'Test User',
      email,
      password,
      confirmPassword: overrides.confirmPassword ?? password,
    })

  // Domain events (profile/subscription auto-creation) are fire-and-forget
  if (response.status === 201) {
    await new Promise((r) => setTimeout(r, 150))
  }

  return {
    response,
    email,
    password,
    userId: response.body?.data?.user?.id as string | undefined,
    accessToken: response.body?.data?.accessToken as string | undefined,
    refreshToken: response.body?.data?.refreshToken as string | undefined,
  }
}

export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
  platform: 'mobile' | 'web' = 'mobile',
): Promise<LoginResult> {
  const req = request(app.getHttpServer()).post('/auth/login').send({
    email,
    password,
  })

  if (platform === 'mobile') {
    req.set('X-Platform', 'mobile')
  }

  const response = await req

  return {
    response,
    accessToken: response.body?.data?.accessToken as string | undefined,
    refreshToken: response.body?.data?.refreshToken as string | undefined,
  }
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function getFirstProfileId(
  app: INestApplication,
  token: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .get('/profiles')
    .set(authHeader(token))

  if (!response.body?.data?.profiles?.[0]) {
    throw new Error(
      `getFirstProfileId failed — status: ${response.status}, body: ${JSON.stringify(response.body)}`,
    )
  }

  return response.body.data.profiles[0].id
}

export async function truncateAllTables(app: INestApplication) {
  const prisma = app.get(PrismaService)

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      history_items, progress, watchlist_items, favorites,
      active_streams, password_reset_tokens, refresh_tokens,
      subscriptions, profiles, users
    CASCADE
  `)
}

export async function seedPlans(app: INestApplication) {
  const prisma = app.get(PrismaService)

  const plans = [
    {
      name: 'Básico',
      slug: 'basico',
      priceCents: 0,
      maxProfiles: 1,
      maxStreams: 1,
      description: '1 perfil, 1 tela',
    },
    {
      name: 'Padrão',
      slug: 'padrao',
      priceCents: 1990,
      maxProfiles: 3,
      maxStreams: 2,
      description: '3 perfis, 2 telas simultâneas',
    },
    {
      name: 'Premium',
      slug: 'premium',
      priceCents: 3990,
      maxProfiles: 5,
      maxStreams: 4,
      description: '5 perfis, 4 telas simultâneas',
    },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        maxProfiles: plan.maxProfiles,
        maxStreams: plan.maxStreams,
        description: plan.description,
      },
      create: plan,
    })
  }
}

export async function cleanupRedis(app: INestApplication) {
  const redis = app.get<Redis>(REDIS_CLIENT)

  const patterns = ['lockout:*', 'streams:*', 'stream:*']

  for (const pattern of patterns) {
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      )
      cursor = nextCursor
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  }
}

export async function fullCleanup(app: INestApplication) {
  await truncateAllTables(app)
  await seedPlans(app)
  await cleanupRedis(app)
}

export async function upgradePlan(
  app: INestApplication,
  userId: string,
  planSlug: string,
) {
  const prisma = app.get(PrismaService)

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } })
  if (!plan) throw new Error(`Plan ${planSlug} not found`)

  await prisma.subscription.updateMany({
    where: { userId },
    data: { planId: plan.id },
  })
}
