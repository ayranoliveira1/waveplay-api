import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { CancelUserSubscriptionController } from './cancel-user-subscription.controller'
import { CancelUserSubscriptionUseCase } from '../../application/use-cases/cancel-user-subscription-use-case'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { SubscriptionsRepository } from '@/modules/subscription/domain/repositories/subscriptions-repository'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { User, UserRole } from '@/modules/identity/domain/entities/user'
import { Subscription } from '@/modules/subscription/domain/entities/subscription'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const USER_ID = '11111111-1111-4111-8111-111111111111'
const MISSING_USER_ID = '22222222-2222-4222-8222-222222222222'

function asAdmin() {
  FakeAuthGuard.prototype.canActivate = function (context) {
    const req = context.switchToHttp().getRequest()
    req.user = { userId: 'admin-1', role: UserRole.ADMIN }
    return true
  }
}

function asUser() {
  FakeAuthGuard.prototype.canActivate = function (context) {
    const req = context.switchToHttp().getRequest()
    req.user = { userId: 'user-1', role: UserRole.USER }
    return true
  }
}

describe('CancelUserSubscriptionController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [CancelUserSubscriptionController],
      providers: [
        CancelUserSubscriptionUseCase,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
        {
          provide: SubscriptionsRepository,
          useClass: InMemorySubscriptionsRepository,
        },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = testModule.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)

    await usersRepository.create(
      User.create(
        {
          name: 'João Silva',
          email: 'joao@email.com',
          passwordHash: 'hashed',
        },
        new UniqueEntityID(USER_ID),
      ),
    )
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 200 and cancel subscription', async () => {
    asAdmin()

    const subscriptionsRepository =
      testModule.get<InMemorySubscriptionsRepository>(SubscriptionsRepository)
    await subscriptionsRepository.create(
      Subscription.create(
        { userId: USER_ID, planId: 'plan-1' },
        new UniqueEntityID('sub-1'),
      ),
    )

    const response = await request(app.getHttpServer()).delete(
      `/admin/users/${USER_ID}/subscription`,
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.subscription.status).toBe('canceled')
    expect(response.body.data.subscription.endsAt).toBeDefined()
    expect(response.body.data.subscription.planId).toBe('plan-1')
  })

  it('should return 404 when user does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      `/admin/users/${MISSING_USER_ID}/subscription`,
    )

    expect(response.status).toBe(404)
  })

  it('should return 404 when user has no active subscription', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      `/admin/users/${USER_ID}/subscription`,
    )

    expect(response.status).toBe(404)
  })

  it('should return 400 when id is not a valid UUID', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      '/admin/users/not-a-uuid/subscription',
    )

    expect(response.status).toBe(400)
  })

  it('should return 403 when caller is a non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer()).delete(
      `/admin/users/${USER_ID}/subscription`,
    )

    expect(response.status).toBe(403)
  })
})
