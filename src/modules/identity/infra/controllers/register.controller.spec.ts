import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
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
import { UsersRepository } from '../../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../../application/ports/hasher.port'
import { EncrypterPort } from '../../application/ports/encrypter.port'
import { AuthConfigPort } from '../../application/ports/auth-config.port'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { ProfilesRepository } from '@/modules/profile/domain/repositories/profiles-repository'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { SubscriptionsRepository } from '@/modules/subscription/domain/repositories/subscriptions-repository'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let app: INestApplication
let testModule: TestingModule

describe('RegisterController', () => {
  beforeAll(() => {
    // Feature flag de cadastro publico esta desabilitada por default.
    // Override aqui garante que os testes deste controller passem.
    process.env.REGISTRATION_ENABLED = 'true'
  })

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
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
        { provide: APP_GUARD, useClass: ThrottlerGuard },

        // Profile + Subscription (direct dependencies of RegisterUseCase)
        { provide: ProfilesRepository, useClass: InMemoryProfilesRepository },
        {
          provide: SubscriptionsRepository,
          useClass: InMemorySubscriptionsRepository,
        },
        {
          provide: PlansRepository,
          useFactory: () => {
            const repo = new InMemoryPlansRepository()
            repo.items.push(
              Plan.create(
                {
                  name: 'Básico',
                  slug: 'basico',
                  priceCents: 0,
                  maxProfiles: 1,
                  maxStreams: 1,
                },
                new UniqueEntityID('plan-basico-id'),
              ),
            )
            return repo
          },
        },
      ],
    }).compile()

    app = testModule.createNestApplication()
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
    expect(response.body.data.user).toBeUndefined()
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.body.data.refreshToken).toBeDefined()
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

  it('should normalize email to lowercase on registration', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Platform', 'mobile')
      .send({
        name: 'João Silva',
        email: 'Joao@Email.COM',
        password: 'Abc12345',
        confirmPassword: 'Abc12345',
      })

    expect(response.status).toBe(201)

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    expect(usersRepository.items).toHaveLength(1)
    expect(usersRepository.items[0].email).toBe('joao@email.com')
  })

  it('should create first profile automatically after registration', async () => {
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

    const profilesRepository =
      testModule.get<InMemoryProfilesRepository>(ProfilesRepository)
    expect(profilesRepository.items).toHaveLength(1)
    expect(profilesRepository.items[0].name).toBe('João Silva')
  })
})
