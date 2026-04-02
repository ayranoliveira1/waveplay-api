import { describe, it, expect, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import cookieParser from 'cookie-parser'

import { RegisterController } from './register.controller'
import { RegisterUseCase } from '../../application/use-cases/register-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakeAuthConfig } from 'test/ports/fake-auth-config'
import { FakePlansGateway } from 'test/ports/fake-plans-gateway'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../../application/ports/hasher.port'
import { EncrypterPort } from '../../application/ports/encrypter.port'
import { AuthConfigPort } from '../../application/ports/auth-config.port'
import { PlansGatewayPort } from '../../application/ports/plans-gateway.port'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication

describe('RegisterController', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [RegisterController],
      providers: [
        RegisterUseCase,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
        {
          provide: RefreshTokensRepository,
          useClass: InMemoryRefreshTokensRepository,
        },
        { provide: HasherPort, useClass: FakeHasher },
        { provide: EncrypterPort, useClass: FakeEncrypter },
        { provide: AuthConfigPort, useClass: FakeAuthConfig },
        { provide: PlansGatewayPort, useClass: FakePlansGateway },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.use(cookieParser())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
  })

  it('should return tokens in body for mobile platform', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'João Silva',
        email: 'joao@email.com',
        password: 'Abc12345',
        confirmPassword: 'Abc12345',
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.user).toBeDefined()
    expect(response.body.data.user.email).toBe('joao@email.com')
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeDefined()

    // Não deve ter passwordHash no response
    expect(response.body.data.user.passwordHash).toBeUndefined()
  })

  it('should set refresh token as httpOnly cookie for web platform', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'João Silva',
        email: 'joao@email.com',
        password: 'Abc12345',
        confirmPassword: 'Abc12345',
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeUndefined()

    // Cookie deve estar presente
    const cookies = response.headers['set-cookie']
    expect(cookies).toBeDefined()

    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refreshToken='))
      : cookies

    expect(refreshCookie).toBeDefined()
    expect(refreshCookie).toContain('HttpOnly')
    expect(refreshCookie).toContain('SameSite=Strict')
    expect(refreshCookie).toContain('Path=/auth')
  })
})
