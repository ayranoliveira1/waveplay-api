import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { UpdateUserSubscriptionController } from './update-user-subscription.controller'
import { UpdateUserSubscriptionUseCase } from '../../application/use-cases/update-user-subscription-use-case'
import { AdminUserGatewayPort } from '../../application/ports/admin-user-gateway.port'
import { FakeAdminUserGateway } from 'test/ports/fake-admin-user-gateway'
import { SubscriptionsRepository } from '@/modules/subscription/domain/repositories/subscriptions-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { ProfilesRepository } from '@/modules/profile/domain/repositories/profiles-repository'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { Subscription } from '@/modules/subscription/domain/entities/subscription'
import { Profile } from '@/modules/profile/domain/entities/profile'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { UserRole } from '@/modules/identity/domain/entities/user'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const USER_ID = '33333333-3333-4333-8333-333333333333'
const MISSING_USER_ID = '44444444-4444-4444-8444-444444444444'
const BASICO_PLAN_ID = '11111111-1111-4111-8111-111111111111'
const PREMIUM_PLAN_ID = '22222222-2222-4222-8222-222222222222'
const MISSING_PLAN_ID = '55555555-5555-4555-8555-555555555555'

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

function seedExistingUser() {
  const gateway = testModule.get<FakeAdminUserGateway>(AdminUserGatewayPort)
  gateway.details.set(USER_ID, {
    id: USER_ID,
    name: 'Alice Silva',
    email: 'alice@example.com',
    role: 'user',
    createdAt: new Date('2026-01-01'),
    subscription: null,
    profiles: [],
  })
}

describe('UpdateUserSubscriptionController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [UpdateUserSubscriptionController],
      providers: [
        UpdateUserSubscriptionUseCase,
        {
          provide: SubscriptionsRepository,
          useClass: InMemorySubscriptionsRepository,
        },
        { provide: ProfilesRepository, useClass: InMemoryProfilesRepository },
        {
          provide: AdminUserGatewayPort,
          useClass: FakeAdminUserGateway,
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
                new UniqueEntityID(BASICO_PLAN_ID),
              ),
              Plan.create(
                {
                  name: 'Premium',
                  slug: 'premium',
                  priceCents: 2990,
                  maxProfiles: 4,
                  maxStreams: 4,
                },
                new UniqueEntityID(PREMIUM_PLAN_ID),
              ),
            )
            return repo
          },
        },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = testModule.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should update active subscription to new plan (warning null on upgrade)', async () => {
    asAdmin()
    seedExistingUser()

    const subscriptionsRepository =
      testModule.get<InMemorySubscriptionsRepository>(SubscriptionsRepository)
    subscriptionsRepository.items.push(
      Subscription.create({ userId: USER_ID, planId: BASICO_PLAN_ID }),
    )

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}/subscription`)
      .send({ planId: PREMIUM_PLAN_ID })

    expect(response.status).toBe(200)
    expect(response.body.data.subscription.planId).toBe(PREMIUM_PLAN_ID)
    expect(response.body.data.warning).toBeNull()
  })

  it('should create subscription when user has none', async () => {
    asAdmin()
    seedExistingUser()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}/subscription`)
      .send({ planId: PREMIUM_PLAN_ID })

    expect(response.status).toBe(200)
    expect(response.body.data.subscription.planId).toBe(PREMIUM_PLAN_ID)

    const subscriptionsRepository =
      testModule.get<InMemorySubscriptionsRepository>(SubscriptionsRepository)
    expect(subscriptionsRepository.items).toHaveLength(1)
  })

  it('should return warning on downgrade without deleting profiles', async () => {
    asAdmin()
    seedExistingUser()

    const subscriptionsRepository =
      testModule.get<InMemorySubscriptionsRepository>(SubscriptionsRepository)
    subscriptionsRepository.items.push(
      Subscription.create({ userId: USER_ID, planId: PREMIUM_PLAN_ID }),
    )

    const profilesRepository =
      testModule.get<InMemoryProfilesRepository>(ProfilesRepository)
    profilesRepository.items.push(
      Profile.create({ userId: USER_ID, name: 'Profile 1' }),
      Profile.create({ userId: USER_ID, name: 'Profile 2' }),
      Profile.create({ userId: USER_ID, name: 'Profile 3' }),
    )

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}/subscription`)
      .send({ planId: BASICO_PLAN_ID })

    expect(response.status).toBe(200)
    expect(response.body.data.subscription.planId).toBe(BASICO_PLAN_ID)
    expect(response.body.data.warning).toContain('3 perfis')
    expect(response.body.data.warning).toContain('apenas 1')

    // perfis nao sao deletados
    expect(profilesRepository.items).toHaveLength(3)
  })

  it('should return warning null on upgrade', async () => {
    asAdmin()
    seedExistingUser()

    const subscriptionsRepository =
      testModule.get<InMemorySubscriptionsRepository>(SubscriptionsRepository)
    subscriptionsRepository.items.push(
      Subscription.create({ userId: USER_ID, planId: BASICO_PLAN_ID }),
    )

    const profilesRepository =
      testModule.get<InMemoryProfilesRepository>(ProfilesRepository)
    profilesRepository.items.push(
      Profile.create({ userId: USER_ID, name: 'Profile 1' }),
    )

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}/subscription`)
      .send({ planId: PREMIUM_PLAN_ID })

    expect(response.status).toBe(200)
    expect(response.body.data.warning).toBeNull()
  })

  it('should return 404 when user does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${MISSING_USER_ID}/subscription`)
      .send({ planId: PREMIUM_PLAN_ID })

    expect(response.status).toBe(404)
  })

  it('should return 404 when plan does not exist', async () => {
    asAdmin()
    seedExistingUser()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}/subscription`)
      .send({ planId: MISSING_PLAN_ID })

    expect(response.status).toBe(404)
  })

  it('should return 403 for non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}/subscription`)
      .send({ planId: PREMIUM_PLAN_ID })

    expect(response.status).toBe(403)
  })
})
