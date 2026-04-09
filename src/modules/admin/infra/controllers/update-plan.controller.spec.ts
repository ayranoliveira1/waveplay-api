import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { UpdatePlanController } from './update-plan.controller'
import { UpdatePlanUseCase } from '../../application/use-cases/update-plan-use-case'
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

const EXISTING_PLAN_ID = '11111111-1111-4111-8111-111111111111'
const MISSING_PLAN_ID = '22222222-2222-4222-8222-222222222222'

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

describe('UpdatePlanController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [UpdatePlanController],
      providers: [
        UpdatePlanUseCase,
        {
          provide: PlansRepository,
          useFactory: () => {
            const repo = new InMemoryPlansRepository()
            repo.items.push(
              Plan.create(
                {
                  name: 'Padrão',
                  slug: 'padrao',
                  priceCents: 1990,
                  maxProfiles: 3,
                  maxStreams: 2,
                  description: 'Plano padrão',
                },
                new UniqueEntityID(EXISTING_PLAN_ID),
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

  it('should return 200 and partial-update the plan preserving other fields', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${EXISTING_PLAN_ID}`)
      .send({ priceCents: 2490 })

    expect(response.status).toBe(200)
    expect(response.body.data.plan).toMatchObject({
      id: EXISTING_PLAN_ID,
      name: 'Padrão',
      slug: 'padrao',
      priceCents: 2490,
      maxProfiles: 3,
      maxStreams: 2,
      description: 'Plano padrão',
    })
  })

  it('should update name + priceCents + description', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${EXISTING_PLAN_ID}`)
      .send({
        name: 'Padrão Plus',
        priceCents: 2490,
        description: 'Nova descrição',
      })

    expect(response.status).toBe(200)
    expect(response.body.data.plan).toMatchObject({
      name: 'Padrão Plus',
      priceCents: 2490,
      description: 'Nova descrição',
    })
  })

  it('should return 404 when planId does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${MISSING_PLAN_ID}`)
      .send({ priceCents: 2490 })

    expect(response.status).toBe(404)
  })

  it('should return 400 when id is not a valid UUID', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch('/admin/plans/not-a-uuid')
      .send({ priceCents: 2490 })

    expect(response.status).toBe(400)
  })

  it('should return 400 when body has extra field (strict mode)', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${EXISTING_PLAN_ID}`)
      .send({ priceCents: 2490, slug: 'hacked' })

    expect(response.status).toBe(400)
  })

  it('should return 403 when user is not admin', async () => {
    asUser()

    const response = await request(app.getHttpServer())
      .patch(`/admin/plans/${EXISTING_PLAN_ID}`)
      .send({ priceCents: 2490 })

    expect(response.status).toBe(403)
  })
})
