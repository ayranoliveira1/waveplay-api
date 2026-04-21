import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { DeletePlanController } from './delete-plan.controller'
import { DeletePlanUseCase } from '../../application/use-cases/delete-plan-use-case'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { SubscriptionsRepository } from '@/modules/subscription/domain/repositories/subscriptions-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { Subscription } from '@/modules/subscription/domain/entities/subscription'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { UserRole } from '@/modules/identity/domain/entities/user'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const EMPTY_PLAN_ID = '11111111-1111-4111-8111-111111111111'
const BUSY_PLAN_ID = '22222222-2222-4222-8222-222222222222'
const MISSING_PLAN_ID = '44444444-4444-4444-8444-444444444444'

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

describe('DeletePlanController', () => {
  beforeEach(async () => {
    const subscriptionsRepo = new InMemorySubscriptionsRepository()
    const plansRepo = new InMemoryPlansRepository(subscriptionsRepo)

    plansRepo.items.push(
      Plan.create(
        {
          name: 'Empty',
          slug: 'empty',
          priceCents: 990,
          maxProfiles: 1,
          maxStreams: 1,
          active: true,
        },
        new UniqueEntityID(EMPTY_PLAN_ID),
      ),
      Plan.create(
        {
          name: 'Busy',
          slug: 'busy',
          priceCents: 2990,
          maxProfiles: 5,
          maxStreams: 4,
          active: true,
        },
        new UniqueEntityID(BUSY_PLAN_ID),
      ),
    )

    subscriptionsRepo.items.push(
      Subscription.create({
        userId: 'user-1',
        planId: BUSY_PLAN_ID,
        status: 'active',
      }),
      Subscription.create({
        userId: 'user-2',
        planId: BUSY_PLAN_ID,
        status: 'canceled',
      }),
    )

    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [DeletePlanController],
      providers: [
        DeletePlanUseCase,
        { provide: PlansRepository, useValue: plansRepo },
        { provide: SubscriptionsRepository, useValue: subscriptionsRepo },
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

  it('should return 204 and remove the plan from repository', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      `/admin/plans/${EMPTY_PLAN_ID}`,
    )

    expect(response.status).toBe(204)
    expect(response.body).toEqual({})

    const plansRepository =
      testModule.get<InMemoryPlansRepository>(PlansRepository)
    expect(
      plansRepository.items.some((p) => p.id.toValue() === EMPTY_PLAN_ID),
    ).toBe(false)
  })

  it('should return 409 when plan has subscriptions (active or historical)', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      `/admin/plans/${BUSY_PLAN_ID}`,
    )

    expect(response.status).toBe(409)

    const plansRepository =
      testModule.get<InMemoryPlansRepository>(PlansRepository)
    expect(
      plansRepository.items.some((p) => p.id.toValue() === BUSY_PLAN_ID),
    ).toBe(true)
  })

  it('should return 404 when plan does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      `/admin/plans/${MISSING_PLAN_ID}`,
    )

    expect(response.status).toBe(404)
  })

  it('should return 400 when id is not a valid UUID', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      '/admin/plans/not-a-uuid',
    )

    expect(response.status).toBe(400)
  })

  it('should return 403 when caller is a non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer()).delete(
      `/admin/plans/${EMPTY_PLAN_ID}`,
    )

    expect(response.status).toBe(403)
  })
})
