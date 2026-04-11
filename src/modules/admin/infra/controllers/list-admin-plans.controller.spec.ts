import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ListAdminPlansController } from './list-admin-plans.controller'
import { ListAdminPlansUseCase } from '../../application/use-cases/list-admin-plans-use-case'
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

describe('ListAdminPlansController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ListAdminPlansController],
      providers: [
        ListAdminPlansUseCase,
        {
          provide: PlansRepository,
          useFactory: () => {
            const repo = new InMemoryPlansRepository()
            repo.items.push(
              Plan.create(
                {
                  name: 'Basico',
                  slug: 'basico',
                  priceCents: 990,
                  maxProfiles: 1,
                  maxStreams: 1,
                  description: 'Plano basico',
                  active: true,
                },
                new UniqueEntityID('plan-basico'),
              ),
              Plan.create(
                {
                  name: 'Premium',
                  slug: 'premium',
                  priceCents: 2990,
                  maxProfiles: 5,
                  maxStreams: 4,
                  description: 'Plano premium',
                  active: true,
                },
                new UniqueEntityID('plan-premium'),
              ),
              Plan.create(
                {
                  name: 'Legacy',
                  slug: 'legacy',
                  priceCents: 500,
                  maxProfiles: 1,
                  maxStreams: 1,
                  active: false,
                },
                new UniqueEntityID('plan-legacy'),
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

  it('should return 200 with all plans and correct shape', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).get('/admin/plans')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.error).toBeNull()
    expect(response.body.data.plans).toHaveLength(3)

    expect(response.body.data.plans[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      slug: expect.any(String),
      priceCents: expect.any(Number),
      maxProfiles: expect.any(Number),
      maxStreams: expect.any(Number),
      active: expect.any(Boolean),
    })
  })

  it('should include inactive plans in the response', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).get('/admin/plans')

    const inactivePlan = response.body.data.plans.find(
      (p: { slug: string }) => p.slug === 'legacy',
    )
    expect(inactivePlan).toBeDefined()
    expect(inactivePlan.active).toBe(false)
  })

  it('should return 200 with empty array when no plans exist', async () => {
    asAdmin()

    const plansRepository =
      testModule.get<InMemoryPlansRepository>(PlansRepository)
    plansRepository.items = []

    const response = await request(app.getHttpServer()).get('/admin/plans')

    expect(response.status).toBe(200)
    expect(response.body.data.plans).toHaveLength(0)
  })

  it('should return 403 for non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer()).get('/admin/plans')

    expect(response.status).toBe(403)
  })
})
