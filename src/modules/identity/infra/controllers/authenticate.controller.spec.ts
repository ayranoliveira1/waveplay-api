import { describe, it, expect, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import cookieParser from 'cookie-parser'

import { AuthenticateController } from './authenticate.controller'
import { AuthenticateUseCase } from '../../application/use-cases/authenticate-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakeAuthConfig } from 'test/ports/fake-auth-config'
import { FakeAccountLockout } from 'test/ports/fake-account-lockout'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../../application/ports/hasher.port'
import { EncrypterPort } from '../../application/ports/encrypter.port'
import { AuthConfigPort } from '../../application/ports/auth-config.port'
import { AccountLockoutPort } from '../../application/ports/account-lockout.port'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { User } from '../../domain/entities/user'

let app: INestApplication
let usersRepository: InMemoryUsersRepository

describe('AuthenticateController', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [AuthenticateController],
      providers: [
        AuthenticateUseCase,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
        {
          provide: RefreshTokensRepository,
          useClass: InMemoryRefreshTokensRepository,
        },
        { provide: HasherPort, useClass: FakeHasher },
        { provide: EncrypterPort, useClass: FakeEncrypter },
        { provide: AuthConfigPort, useClass: FakeAuthConfig },
        { provide: AccountLockoutPort, useClass: FakeAccountLockout },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.use(cookieParser())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    usersRepository = module.get(UsersRepository)

    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: 'Abc12345-hashed',
    })

    await usersRepository.create(user)
  })

  it('should return tokens in body for mobile platform', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Platform', 'mobile')
      .send({
        email: 'joao@email.com',
        password: 'Abc12345',
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.user.email).toBe('joao@email.com')
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeDefined()
  })

  it('should set refresh token as httpOnly cookie for web platform', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'joao@email.com',
        password: 'Abc12345',
      })

    expect(response.status).toBe(200)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeUndefined()

    const cookies = response.headers['set-cookie']
    expect(cookies).toBeDefined()

    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refreshToken='))
      : cookies

    expect(refreshCookie).toContain('HttpOnly')
  })

  it('should return 429 on account lockout', async () => {
    // 5 tentativas falhas para travar a conta
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'joao@email.com', password: 'SenhaErrada1' })
    }

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'joao@email.com', password: 'Abc12345' })

    expect(response.status).toBe(429)
  })

  it('should return 429 after exceeding rate limit (10 req/min)', async () => {
    // Limit is 10 per minute on login
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `user${i}@email.com`, password: 'SenhaErrada1' })
    }

    // 11th request should be throttled
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'joao@email.com', password: 'Abc12345' })

    expect(response.status).toBe(429)
  })
})
