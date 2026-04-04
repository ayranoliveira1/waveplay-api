import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './helpers/e2e-app'
import {
  uniqueEmail,
  registerUser,
  fullCleanup,
  cleanupRedis,
} from './helpers/e2e-helpers'

let app: INestApplication

beforeAll(async () => {
  const e2e = await createE2EApp()
  app = e2e.app
  await fullCleanup(app)
})

afterAll(async () => {
  await app.close()
})

describe('Helmet headers', () => {
  it('should set X-Content-Type-Options: nosniff', async () => {
    const response = await request(app.getHttpServer()).get('/profiles')

    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('should set X-Frame-Options', async () => {
    const response = await request(app.getHttpServer()).get('/profiles')

    expect(response.headers['x-frame-options']).toBeDefined()
  })

  it('should set Content-Security-Policy', async () => {
    const response = await request(app.getHttpServer()).get('/profiles')

    expect(response.headers['content-security-policy']).toBeDefined()
  })

  it('should NOT have X-Powered-By header', async () => {
    const response = await request(app.getHttpServer()).get('/profiles')

    expect(response.headers['x-powered-by']).toBeUndefined()
  })
})

describe('CORS', () => {
  it('should return CORS headers for allowed origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    )
  })

  it('should have Access-Control-Allow-Credentials: true', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')

    expect(response.headers['access-control-allow-credentials']).toBe('true')
  })

  it('should list allowed methods', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')

    const methods = response.headers['access-control-allow-methods']
    expect(methods).toContain('GET')
    expect(methods).toContain('POST')
    expect(methods).toContain('PUT')
    expect(methods).toContain('DELETE')
  })

  it('should list allowed headers', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set(
        'Access-Control-Request-Headers',
        'Content-Type,Authorization,X-Platform',
      )

    const headers = response.headers['access-control-allow-headers']
    expect(headers).toBeDefined()
    expect(headers.toLowerCase()).toContain('content-type')
    expect(headers.toLowerCase()).toContain('authorization')
    expect(headers.toLowerCase()).toContain('x-platform')
  })

  it('should not return CORS headers for disallowed origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://malicious-site.com')
      .set('Access-Control-Request-Method', 'POST')

    expect(response.headers['access-control-allow-origin']).not.toBe(
      'http://malicious-site.com',
    )
  })
})

describe('Cookie (refreshToken)', () => {
  it('should set httpOnly, sameSite=Strict, and path=/auth on web login', async () => {
    const email = uniqueEmail()
    await registerUser(app, { email })

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Test1234' })

    const cookies = response.headers['set-cookie']
    expect(cookies).toBeDefined()

    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refreshToken='))
      : cookies

    expect(refreshCookie).toBeDefined()
    expect(refreshCookie).toContain('HttpOnly')
    expect(refreshCookie).toMatch(/SameSite=Strict/i)
    expect(refreshCookie).toContain('Path=/auth')
  })
})

describe('Rate limiting', () => {
  it('should return 429 after 5 failed login attempts (account lockout via Redis)', async () => {
    await cleanupRedis(app)

    const email = uniqueEmail('ratelimit')
    await registerUser(app, { email })

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Platform', 'mobile')
        .send({ email, password: 'WrongPass1' })
    }

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email, password: 'WrongPass1' })

    expect(response.status).toBe(429)
  })
})

describe('Unknown routes', () => {
  it('should return 404 for GET /unknown', async () => {
    const response = await request(app.getHttpServer()).get('/unknown')

    expect(response.status).toBe(404)
  })

  it('should return 404 for GET /admin', async () => {
    const response = await request(app.getHttpServer()).get('/admin')

    expect(response.status).toBe(404)
  })
})

describe('Response format', () => {
  it('should follow { success, data, error: null } on success', async () => {
    const { accessToken } = await registerUser(app)

    const response = await request(app.getHttpServer())
      .get('/profiles')
      .set({ Authorization: `Bearer ${accessToken}` })

    expect(response.body).toHaveProperty('success', true)
    expect(response.body).toHaveProperty('data')
    expect(response.body).toHaveProperty('error', null)
  })

  it('should follow { success: false, data: [], error: [...] } on error', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email: 'nonexistent@test.com', password: 'Wrong1234' })

    expect(response.body.success).toBe(false)
    expect(response.body.data).toEqual([])
    expect(Array.isArray(response.body.error)).toBe(true)
    expect(response.body.error.length).toBeGreaterThan(0)
  })
})
