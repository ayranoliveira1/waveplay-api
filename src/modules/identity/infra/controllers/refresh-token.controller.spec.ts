import { describe, it, expect, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'node:crypto'

import { RefreshTokenController } from './refresh-token.controller'
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token-use-case'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakeAuthConfig } from 'test/ports/fake-auth-config'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { EncrypterPort } from '../../application/ports/encrypter.port'
import { AuthConfigPort } from '../../application/ports/auth-config.port'
import { RefreshToken } from '../../domain/entities/refresh-token'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let refreshTokensRepository: InMemoryRefreshTokensRepository
let authConfig: FakeAuthConfig

describe('RefreshTokenController', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [RefreshTokenController],
      providers: [
        RefreshTokenUseCase,
        {
          provide: RefreshTokensRepository,
          useClass: InMemoryRefreshTokensRepository,
        },
        { provide: EncrypterPort, useClass: FakeEncrypter },
        { provide: AuthConfigPort, useClass: FakeAuthConfig },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.use(cookieParser())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    refreshTokensRepository = module.get(RefreshTokensRepository)
    authConfig = module.get(AuthConfigPort)
  })

  it('should return 400 when refreshToken is not a string', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Platform', 'mobile')
      .send({ refreshToken: 123 })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should read refresh token from body on mobile', async () => {
    const rawToken = randomUUID()
    const { refreshToken } = RefreshToken.createFromRawToken({
      rawToken,
      userId: 'user-1',
      expiresInMs: authConfig.getRefreshTokenExpiresInMs(),
      family: 'family-1',
    })

    await refreshTokensRepository.create(refreshToken)

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Platform', 'mobile')
      .send({ refreshToken: rawToken })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeDefined()
    expect(response.body.data.refreshToken).not.toBe(rawToken)
  })

  it('should read refresh token from cookie on web', async () => {
    const rawToken = randomUUID()
    const { refreshToken } = RefreshToken.createFromRawToken({
      rawToken,
      userId: 'user-1',
      expiresInMs: authConfig.getRefreshTokenExpiresInMs(),
      family: 'family-1',
    })

    await refreshTokensRepository.create(refreshToken)

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${rawToken}`)

    expect(response.status).toBe(200)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeUndefined()

    const cookies = response.headers['set-cookie']
    expect(cookies).toBeDefined()

    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refreshToken='))
      : cookies

    expect(refreshCookie).toBeDefined()
    expect(refreshCookie).toContain('HttpOnly')
  })

  it('should return new token pair on rotation', async () => {
    const rawToken = randomUUID()
    const { refreshToken } = RefreshToken.createFromRawToken({
      rawToken,
      userId: 'user-1',
      expiresInMs: authConfig.getRefreshTokenExpiresInMs(),
      family: 'family-1',
    })

    await refreshTokensRepository.create(refreshToken)

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Platform', 'mobile')
      .send({ refreshToken: rawToken })

    expect(response.status).toBe(200)

    // Token antigo revogado, novo criado
    expect(refreshTokensRepository.items).toHaveLength(2)
    expect(refreshTokensRepository.items[0].isRevoked()).toBe(true)

    // Novo token na mesma family
    expect(refreshTokensRepository.items[1].family).toBe('family-1')
  })
})
