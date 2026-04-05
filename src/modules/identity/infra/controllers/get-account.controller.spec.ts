import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { GetAccountController } from './get-account.controller'
import { GetAccountUseCase } from '../../application/use-cases/get-account-use-case'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { AccountGatewayPort } from '../../application/ports/account-gateway.port'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { FakeAccountGateway } from 'test/ports/fake-account-gateway'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { User } from '../../domain/entities/user'

let app: INestApplication
let usersRepository: InMemoryUsersRepository
let accountGateway: FakeAccountGateway

describe('GetAccountController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [GetAccountController],
      providers: [
        GetAccountUseCase,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
        { provide: AccountGatewayPort, useClass: FakeAccountGateway },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    usersRepository = module.get(UsersRepository)
    accountGateway = module.get(AccountGatewayPort)
  })

  it('should return 200 with user and subscription', async () => {
    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: '12345678-hashed',
    })

    usersRepository.items.push(user)
    FakeAuthGuard.userId = user.id.toValue()

    accountGateway.subscription = {
      id: 'sub-1',
      status: 'active',
      startedAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
      plan: {
        id: 'plan-1',
        name: 'Premium',
        slug: 'premium',
        maxProfiles: 5,
        maxStreams: 3,
      },
    }

    const response = await request(app.getHttpServer()).get('/account')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.error).toBeNull()

    const { user: userData } = response.body.data
    expect(userData.id).toBe(user.id.toValue())
    expect(userData.name).toBe('João Silva')
    expect(userData.email).toBe('joao@email.com')
    expect(userData.createdAt).toBeDefined()

    expect(userData.subscription).not.toBeNull()
    expect(userData.subscription.status).toBe('active')
    expect(userData.subscription.plan.name).toBe('Premium')
    expect(userData.subscription.plan.maxProfiles).toBe(5)
  })

  it('should return 200 with null subscription when none active', async () => {
    const user = User.create({
      name: 'Maria',
      email: 'maria@email.com',
      passwordHash: '12345678-hashed',
    })

    usersRepository.items.push(user)
    FakeAuthGuard.userId = user.id.toValue()

    const response = await request(app.getHttpServer()).get('/account')

    expect(response.status).toBe(200)
    expect(response.body.data.user.name).toBe('Maria')
    expect(response.body.data.user.subscription).toBeNull()
  })

  it('should not expose passwordHash in response', async () => {
    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: '12345678-hashed',
    })

    usersRepository.items.push(user)
    FakeAuthGuard.userId = user.id.toValue()

    const response = await request(app.getHttpServer()).get('/account')

    expect(response.status).toBe(200)
    expect(response.body.data.user.passwordHash).toBeUndefined()
  })
})
