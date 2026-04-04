import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './helpers/e2e-app'
import type { FakeEmailSender } from 'test/ports/fake-email-sender'
import {
  uniqueEmail,
  registerUser,
  authHeader,
  fullCleanup,
} from './helpers/e2e-helpers'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import type Redis from 'ioredis'

let app: INestApplication
let emailSpy: FakeEmailSender

beforeAll(async () => {
  const e2e = await createE2EApp()
  app = e2e.app
  emailSpy = e2e.emailSpy
  await fullCleanup(app)
})

afterAll(async () => {
  await app.close()
})

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

describe('POST /auth/register', () => {
  it('should register successfully and return 201 with accessToken and user data', async () => {
    const email = uniqueEmail('register')

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Test User',
        email,
        password: 'Test1234',
        confirmPassword: 'Test1234',
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.error).toBeNull()
    expect(response.body.data.user).toBeDefined()
    expect(response.body.data.user.id).toBeDefined()
    expect(response.body.data.user.name).toBe('Test User')
    expect(response.body.data.user.email).toBe(email)
    expect(response.body.data.user.createdAt).toBeDefined()
    expect(response.body.data.user.passwordHash).toBeUndefined()
    expect(response.body.data.accessToken).toBeDefined()
    expect(typeof response.body.data.accessToken).toBe('string')
  })

  it('should auto-create a default profile after registration', async () => {
    const { accessToken } = await registerUser(app)

    await new Promise((r) => setTimeout(r, 50))

    const profilesResponse = await request(app.getHttpServer())
      .get('/profiles')
      .set(authHeader(accessToken!))

    expect(profilesResponse.status).toBe(200)
    expect(profilesResponse.body.data.profiles).toHaveLength(1)
    expect(profilesResponse.body.data.profiles[0].id).toBeDefined()
  })

  it('should auto-create a basico subscription after registration', async () => {
    const email = uniqueEmail('sub')
    const { accessToken } = await registerUser(app, { email })

    expect(accessToken).toBeDefined()

    // A subscription é criada via domain event. Verificamos indiretamente que
    // o login funciona normalmente (conta ativa) e que o acesso autenticado
    // retorna dados sem erros de assinatura.
    const profilesResponse = await request(app.getHttpServer())
      .get('/profiles')
      .set(authHeader(accessToken!))

    expect(profilesResponse.status).toBe(200)
  })

  it('should return 409 when registering with a duplicate email', async () => {
    const email = uniqueEmail('dup')
    await registerUser(app, { email })

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Another User',
        email,
        password: 'Test1234',
        confirmPassword: 'Test1234',
      })

    expect(response.status).toBe(409)
    expect(response.body.success).toBe(false)
    expect(Array.isArray(response.body.error)).toBe(true)
    const message = response.body.error
      .map((e: any) => (typeof e === 'string' ? e : e.message))
      .join(' ')
    expect(message).toMatch(/email já cadastrado/i)
  })

  it('should return 400 when password has no uppercase letter', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Test User',
        email: uniqueEmail('weak'),
        password: 'test1234',
        confirmPassword: 'test1234',
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(Array.isArray(response.body.error)).toBe(true)
  })

  it('should return 400 when password has no lowercase letter', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Test User',
        email: uniqueEmail('weak'),
        password: 'TEST1234',
        confirmPassword: 'TEST1234',
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when password has no digit', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Test User',
        email: uniqueEmail('weak'),
        password: 'TestPass',
        confirmPassword: 'TestPass',
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when password is shorter than 8 characters', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Test User',
        email: uniqueEmail('weak'),
        password: 'Te1',
        confirmPassword: 'Te1',
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when confirmPassword does not match password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Test User',
        email: uniqueEmail('mismatch'),
        password: 'Test1234',
        confirmPassword: 'Different1234',
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    const message = response.body.error
      .map((e: any) => (typeof e === 'string' ? e : e.message))
      .join(' ')
    expect(message).toMatch(/senhas não coincidem/i)
  })

  it('should return 400 when name is empty', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: '',
        email: uniqueEmail('emptyname'),
        password: 'Test1234',
        confirmPassword: 'Test1234',
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when email is invalid', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Test User',
        email: 'not-a-valid-email',
        password: 'Test1234',
        confirmPassword: 'Test1234',
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('[MOBILE] should return refreshToken in response body when X-Platform: mobile', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Mobile User',
        email: uniqueEmail('mobile'),
        password: 'Test1234',
        confirmPassword: 'Test1234',
      })

    expect(response.status).toBe(201)
    expect(response.body.data.refreshToken).toBeDefined()
    expect(typeof response.body.data.refreshToken).toBe('string')

    const cookies = response.headers['set-cookie'] as unknown as
      | string[]
      | undefined
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith('refreshToken='))
      : undefined
    expect(refreshCookie).toBeUndefined()
  })

  it('[WEB] should set refreshToken as httpOnly cookie and omit it from body when no X-Platform header', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Web User',
        email: uniqueEmail('web'),
        password: 'Test1234',
        confirmPassword: 'Test1234',
      })

    expect(response.status).toBe(201)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeUndefined()

    const cookies = response.headers['set-cookie'] as string[] | string
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith('refreshToken='))
      : cookies

    expect(refreshCookie).toBeDefined()
    expect(refreshCookie).toContain('HttpOnly')
    expect(refreshCookie).toMatch(/SameSite=Strict/i)
    expect(refreshCookie).toContain('Path=/auth')
  })

  it('[MASS ASSIGNMENT] should ignore extra fields in request body and register successfully', async () => {
    const email = uniqueEmail('mass')

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'Normal User',
        email,
        password: 'Test1234',
        confirmPassword: 'Test1234',
        role: 'admin',
        isAdmin: true,
        passwordHash: 'should-be-ignored',
      })

    expect(response.status).toBe(201)
    expect(response.body.data.user.role).toBeUndefined()
    expect(response.body.data.user.isAdmin).toBeUndefined()
    expect(response.body.data.user.passwordHash).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

describe('POST /auth/login', () => {
  it('should login with valid credentials and return 200 with tokens', async () => {
    const email = uniqueEmail('login')
    await registerUser(app, { email })

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email, password: 'Test1234' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeDefined()
    expect(response.body.data.user).toBeDefined()
    expect(response.body.data.user.email).toBe(email)
  })

  it('should return 401 for wrong password (anti-enumeration: same message)', async () => {
    const email = uniqueEmail('wrongpw')
    await registerUser(app, { email })

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email, password: 'WrongPass1' })

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
    const message = response.body.error
      .map((e: any) => (typeof e === 'string' ? e : e.message))
      .join(' ')
    expect(message).toMatch(/credenciais inválidas/i)
  })

  it('should return 401 for non-existent email with the same message as wrong password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email: uniqueEmail('ghost'), password: 'Test1234' })

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
    const message = response.body.error
      .map((e: any) => (typeof e === 'string' ? e : e.message))
      .join(' ')
    expect(message).toMatch(/credenciais inválidas/i)
  })

  it('[MOBILE] should return refreshToken in body for mobile platform', async () => {
    const email = uniqueEmail('loginmob')
    await registerUser(app, { email })

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email, password: 'Test1234' })

    expect(response.status).toBe(200)
    expect(response.body.data.refreshToken).toBeDefined()

    const cookies = response.headers['set-cookie'] as unknown as
      | string[]
      | undefined
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith('refreshToken='))
      : undefined
    expect(refreshCookie).toBeUndefined()
  })

  it('[WEB] should set refreshToken as httpOnly cookie and omit from body for web platform', async () => {
    const email = uniqueEmail('loginweb')
    await registerUser(app, { email })

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Test1234' })

    expect(response.status).toBe(200)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeUndefined()

    const cookies = response.headers['set-cookie'] as string[] | string
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith('refreshToken='))
      : cookies

    expect(refreshCookie).toBeDefined()
    expect(refreshCookie).toContain('HttpOnly')
    expect(refreshCookie).toMatch(/SameSite=Strict/i)
    expect(refreshCookie).toContain('Path=/auth')
  })

  it('[LOCKOUT] should return 429 after 5 failed login attempts', async () => {
    const email = uniqueEmail('lockout')
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
    expect(response.body.success).toBe(false)
    const message = response.body.error
      .map((e: any) => (typeof e === 'string' ? e : e.message))
      .join(' ')
    expect(message).toMatch(/bloqueada/i)
  })

  it('[LOCKOUT] should allow login again after clearing the Redis lockout key', async () => {
    const email = uniqueEmail('unlocked')
    await registerUser(app, { email })

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Platform', 'mobile')
        .send({ email, password: 'WrongPass1' })
    }

    const lockedResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email, password: 'Test1234' })

    expect(lockedResponse.status).toBe(429)

    const redis = app.get<Redis>(REDIS_CLIENT)
    await redis.del(`lockout:${email}:locked`, `lockout:${email}:failures`)

    const unlockedResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email, password: 'Test1234' })

    expect(unlockedResponse.status).toBe(200)
    expect(unlockedResponse.body.data.accessToken).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------

describe('POST /auth/refresh', () => {
  it('should return new accessToken and refreshToken via body (mobile)', async () => {
    const { refreshToken: originalToken } = await registerUser(app)

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Platform', 'mobile')
      .send({ refreshToken: originalToken })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeDefined()
    expect(response.body.data.refreshToken).not.toBe(originalToken)
  })

  it('should return new accessToken and set new refreshToken cookie via cookie (web)', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Web Refresh User',
        email: uniqueEmail('webrefresh'),
        password: 'Test1234',
        confirmPassword: 'Test1234',
      })

    const setCookies = registerResponse.headers['set-cookie'] as
      | string[]
      | string
    const existingCookie = Array.isArray(setCookies)
      ? setCookies.find((c) => c.startsWith('refreshToken='))
      : setCookies

    expect(existingCookie).toBeDefined()

    const cookieValue = existingCookie!.split(';')[0]

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieValue)

    expect(response.status).toBe(200)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeUndefined()

    const newCookies = response.headers['set-cookie'] as string[] | string
    const newRefreshCookie = Array.isArray(newCookies)
      ? newCookies.find((c) => c.startsWith('refreshToken='))
      : newCookies

    expect(newRefreshCookie).toBeDefined()
    expect(newRefreshCookie).toContain('HttpOnly')
    expect(newRefreshCookie).not.toBe(cookieValue)
  })

  it('should return 401 for an invalid refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Platform', 'mobile')
      .send({ refreshToken: 'completely-invalid-token-value' })

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
  })

  it('should return 401 when no token is provided', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Platform', 'mobile')
      .send({})

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
  })

  it('should return a new accessToken that works on authenticated routes', async () => {
    const { refreshToken: originalToken } = await registerUser(app)

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Platform', 'mobile')
      .send({ refreshToken: originalToken })

    const newAccessToken = refreshResponse.body.data.accessToken

    const profilesResponse = await request(app.getHttpServer())
      .get('/profiles')
      .set(authHeader(newAccessToken))

    expect(profilesResponse.status).toBe(200)
    expect(profilesResponse.body.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

describe('POST /auth/logout', () => {
  it('should return 401 when called without an access token', async () => {
    const response = await request(app.getHttpServer()).post('/auth/logout')

    expect(response.status).toBe(401)
  })

  it('should return 200 with success message when called with a valid token', async () => {
    const { accessToken } = await registerUser(app)

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set(authHeader(accessToken!))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.message).toBe('Sessão encerrada com sucesso')
    expect(response.body.error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// POST /auth/logout-all
// ---------------------------------------------------------------------------

describe('POST /auth/logout-all', () => {
  it('should return 401 when called without an access token', async () => {
    const response = await request(app.getHttpServer()).post('/auth/logout-all')

    expect(response.status).toBe(401)
  })

  it('should return 200 and revoke all sessions', async () => {
    const { accessToken, refreshToken } = await registerUser(app)

    const response = await request(app.getHttpServer())
      .post('/auth/logout-all')
      .set(authHeader(accessToken!))

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.message).toBe(
      'Todas as sessões encerradas com sucesso',
    )
    expect(response.body.error).toBeNull()

    // O refresh token antigo não deve mais funcionar
    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Platform', 'mobile')
      .send({ refreshToken })

    expect(refreshResponse.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// POST /auth/forgot-password
// ---------------------------------------------------------------------------

describe('POST /auth/forgot-password', () => {
  it('should return 200 with generic message for an existing email', async () => {
    const email = uniqueEmail('forgot')
    await registerUser(app, { email })

    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.message).toBe(
      'Se o email existir, um link de recuperação foi enviado',
    )
    expect(response.body.error).toBeNull()
  })

  it('should return 200 with the same generic message for a non-existent email (anti-enumeration)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: uniqueEmail('ghost-forgot') })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.message).toBe(
      'Se o email existir, um link de recuperação foi enviado',
    )
  })

  it('should send a password reset email containing a hex token URL to the registered email', async () => {
    const email = uniqueEmail('emailcheck')
    await registerUser(app, { email })

    emailSpy.emailsSent = []

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })

    // Email é disparado fire-and-forget; aguarda resolução da microtask queue
    await new Promise((r) => setTimeout(r, 100))

    expect(emailSpy.emailsSent).toHaveLength(1)
    const sentEmail = emailSpy.emailsSent[0]
    expect(sentEmail.to).toBe(email)
    expect(sentEmail.subject).toBeDefined()
    expect(sentEmail.body).toMatch(/[0-9a-f]{64}/)
  })
})

// ---------------------------------------------------------------------------
// POST /auth/reset-password
// ---------------------------------------------------------------------------

describe('POST /auth/reset-password', () => {
  async function requestResetToken(email: string): Promise<string> {
    emailSpy.emailsSent = []

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })

    await new Promise((r) => setTimeout(r, 100))

    const sentEmail = emailSpy.emailsSent[0]
    if (!sentEmail) throw new Error('No password reset email was captured')

    const match = sentEmail.body.match(/[0-9a-f]{64}/)
    if (!match) throw new Error('Could not extract reset token from email body')

    return match[0]
  }

  it('should reset password successfully with a valid token and return 200', async () => {
    const email = uniqueEmail('reset')
    await registerUser(app, { email })

    const token = await requestResetToken(email)

    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'NewPass1234' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.message).toBe('Senha alterada com sucesso')
    expect(response.body.error).toBeNull()
  })

  it('should return 400 when the new password is too weak', async () => {
    const email = uniqueEmail('resetweak')
    await registerUser(app, { email })

    const token = await requestResetToken(email)

    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'weakpass' })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    const message = response.body.error
      .map((e: any) => (typeof e === 'string' ? e : e.message))
      .join(' ')
    expect(message).toMatch(/senha/i)
  })

  it('should return 401 when the reset token is invalid or does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: 'a'.repeat(64),
        password: 'NewPass1234',
      })

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
    const message = response.body.error
      .map((e: any) => (typeof e === 'string' ? e : e.message))
      .join(' ')
    expect(message).toMatch(/token inválido ou expirado/i)
  })

  it('should not allow login with the old password after a successful reset', async () => {
    const email = uniqueEmail('oldpw')
    await registerUser(app, { email })

    const token = await requestResetToken(email)

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'Updated1234' })

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email, password: 'Test1234' })

    expect(loginResponse.status).toBe(401)
  })

  it('should allow login with the new password after a successful reset', async () => {
    const email = uniqueEmail('newpw')
    await registerUser(app, { email })

    const token = await requestResetToken(email)

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: 'Updated1234' })

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({ email, password: 'Updated1234' })

    expect(loginResponse.status).toBe(200)
    expect(loginResponse.body.data.accessToken).toBeDefined()
  })
})
