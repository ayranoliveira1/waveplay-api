import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './helpers/e2e-app'
import { uniqueEmail, fullCleanup, cleanupRedis } from './helpers/e2e-helpers'

let app: INestApplication

beforeAll(async () => {
  const e2e = await createE2EApp({ enableThrottling: true })
  app = e2e.app
  await fullCleanup(app)
})

afterAll(async () => {
  await app.close()
})

describe('ThrottlerGuard — POST /auth/forgot-password (limit: 3/60s)', () => {
  it('should allow requests within the limit and return 429 on the 4th', async () => {
    const email = uniqueEmail('throttle-forgot')

    for (let i = 0; i < 3; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })

      expect(res.status).toBe(200)
    }

    const blocked = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })

    expect(blocked.status).toBe(429)
  })
})

describe('ThrottlerGuard — POST /auth/login (limit: 5/60s)', () => {
  it('should return 429 after exceeding the per-endpoint limit', async () => {
    await cleanupRedis(app)

    // Use a different email per request to avoid Redis-based account lockout
    // (lockout is per-email, ThrottlerGuard is per-IP)
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Platform', 'mobile')
        .send({
          email: uniqueEmail(`throttle-login-${i}`),
          password: 'Test1234',
        })
    }

    const blocked = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({
        email: uniqueEmail('throttle-login-extra'),
        password: 'Test1234',
      })

    expect(blocked.status).toBe(429)
  })
})

describe('ThrottlerGuard — POST /auth/register (limit: 5/60s)', () => {
  it('should return 429 after exceeding the per-endpoint limit', async () => {
    // Send invalid data (mismatched passwords → 400) to avoid domain events
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Platform', 'mobile')
        .send({
          name: 'Throttle User',
          email: uniqueEmail(`throttle-reg-${i}`),
          password: 'Test1234',
          confirmPassword: 'Mismatch1234',
        })

      expect(res.status).toBe(400)
    }

    const blocked = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Throttle User',
        email: uniqueEmail('throttle-reg-extra'),
        password: 'Test1234',
        confirmPassword: 'Mismatch1234',
      })

    expect(blocked.status).toBe(429)
  })
})
