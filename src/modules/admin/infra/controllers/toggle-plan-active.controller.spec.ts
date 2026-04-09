import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { TogglePlanActiveController } from './toggle-plan-active.controller'
import { TogglePlanActiveUseCase } from '../../application/use-cases/toggle-plan-active-use-case'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { UserRole } from '@/modules/identity/domain/entities/user'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const ACTIVE_PLAN_ID = '11111111-1111-4111-8111-111111111111'
const INACTIVE_PLAN_ID = '22222222-2222-4222-8222-222222222222'
const MISSING_PLAN_ID = '33333333-3333-4333-8333-333333333333'

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

describe('TogglePlanActiveController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [TogglePlanActiveController],
      providers: [
        TogglePlanActiveUseCase,
        {
          provide: PlansRepository,
          useFactory: () => {
            const repo = new InMemoryPlansRepository()
            repo.items.push(
              Plan.create(
                {
                  name: 'Ativo',
                  slug: 'ativo',
                  priceCents: 1990,
                  maxProfiles: 3,
                  maxStreams: 2,
                  active: true,
                },
                new UniqueEntityID(ACTIVE_PLAN_ID),
              ),
              Plan.create(
                {
                  name: 'Inativo',
                  slug: 'inativo',
                  priceCents: 2990,
                  maxProfiles: 4,
                  maxStreams: 3,
                  active: false,
                },
                new UniqueEntityID(INACTIVE_PLAN_ID),
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

  it('should deactivate an active plan (200)', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${ACTIVE_PLAN_ID}/toggle`)
      .send()

    expect(response.status).toBe(200)
    expect(response.body.data.plan.active).toBe(false)
  })

  it('should reactivate an inactive plan (200)', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${INACTIVE_PLAN_ID}/toggle`)
      .send()

    expect(response.status).toBe(200)
    expect(response.body.data.plan.active).toBe(true)
  })

  it('should return 404 when planId does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${MISSING_PLAN_ID}/toggle`)
      .send()

    expect(response.status).toBe(404)
  })

  it('should return 400 when id is not a valid UUID', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch('/admin/plans/not-a-uuid/toggle')
      .send()

    expect(response.status).toBe(400)
  })

  it('should return 403 when user is not admin', async () => {
    asUser()

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${ACTIVE_PLAN_ID}/toggle`)
      .send()

    expect(response.status).toBe(403)
  })
})
