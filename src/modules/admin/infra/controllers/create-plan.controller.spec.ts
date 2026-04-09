import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { CreatePlanController } from './create-plan.controller'
import { CreatePlanUseCase } from '../../application/use-cases/create-plan-use-case'
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

describe('CreatePlanController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [CreatePlanController],
      providers: [
        CreatePlanUseCase,
        {
          provide: PlansRepository,
          useFactory: () => {
            const repo = new InMemoryPlansRepository()
            repo.items.push(
              Plan.create(
                {
                  name: 'Existente',
                  slug: 'existente',
                  priceCents: 1990,
                  maxProfiles: 3,
                  maxStreams: 2,
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

  it('should return 201 with created plan', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .send({
        name: 'Premium',
        slug: 'premium',
        priceCents: 3990,
        maxProfiles: 5,
        maxStreams: 4,
        description: 'Plano premium',
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.plan).toMatchObject({
      id: expect.any(String),
      name: 'Premium',
      slug: 'premium',
      priceCents: 3990,
      maxProfiles: 5,
      maxStreams: 4,
      description: 'Plano premium',
      active: true,
    })
  })

  it('should persist plan in repository', async () => {
    asAdmin()

    await request(app.getHttpServer()).post('/admin/plans').send({
      name: 'Premium',
      slug: 'premium',
      priceCents: 3990,
      maxProfiles: 5,
      maxStreams: 4,
    })

    const plansRepository =
      testModule.get<InMemoryPlansRepository>(PlansRepository)
    // 1 seed + 1 new = 2
    expect(plansRepository.items).toHaveLength(2)
    expect(plansRepository.items[1].slug).toBe('premium')
  })

  it('should return 409 when slug already exists', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .send({
        name: 'Outro',
        slug: 'existente',
        priceCents: 2990,
        maxProfiles: 4,
        maxStreams: 3,
      })

    expect(response.status).toBe(409)
  })

  it('should return 400 when slug has invalid characters', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .send({
        name: 'Premium',
        slug: 'Premium!',
        priceCents: 3990,
        maxProfiles: 5,
        maxStreams: 4,
      })

    expect(response.status).toBe(400)
  })

  it('should return 400 when priceCents is negative', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .send({
        name: 'Premium',
        slug: 'premium',
        priceCents: -1,
        maxProfiles: 5,
        maxStreams: 4,
      })

    expect(response.status).toBe(400)
  })

  it('should return 400 when maxProfiles is less than 1', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .send({
        name: 'Premium',
        slug: 'premium',
        priceCents: 3990,
        maxProfiles: 0,
        maxStreams: 4,
      })

    expect(response.status).toBe(400)
  })

  it('should return 400 when body has extra field (strict mode)', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .send({
        name: 'Premium',
        slug: 'premium',
        priceCents: 3990,
        maxProfiles: 5,
        maxStreams: 4,
        active: false,
      })

    expect(response.status).toBe(400)
  })

  it('should return 403 when user is not admin', async () => {
    asUser()

    const response = await request(app.getHttpServer())
      .post('/admin/plans')
      .send({
        name: 'Premium',
        slug: 'premium',
        priceCents: 3990,
        maxProfiles: 5,
        maxStreams: 4,
      })

    expect(response.status).toBe(403)
  })
})
