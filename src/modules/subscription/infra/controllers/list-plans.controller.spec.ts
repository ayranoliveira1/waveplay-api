import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ListPlansController } from './list-plans.controller'
import { ListPlansUseCase } from '../../application/use-cases/list-plans-use-case'
import { PlansRepository } from '../../domain/repositories/plans-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { Plan } from '../../domain/entities/plan'

let app: INestApplication
let plansRepository: InMemoryPlansRepository

describe('ListPlansController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ListPlansController],
      providers: [
        ListPlansUseCase,
        { provide: PlansRepository, useClass: InMemoryPlansRepository },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    plansRepository = module.get(PlansRepository)
  })

  it('should return 200 with list of active plans', async () => {
    plansRepository.items.push(
      Plan.create({
        name: 'Básico',
        slug: 'basico',
        priceCents: 0,
        maxProfiles: 1,
        maxStreams: 1,
      }),
      Plan.create({
        name: 'Padrão',
        slug: 'padrao',
        priceCents: 1990,
        maxProfiles: 3,
        maxStreams: 2,
      }),
    )

    const response = await request(app.getHttpServer()).get('/plans')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.plans).toHaveLength(2)
    expect(response.body.data.plans[0].name).toBe('Básico')
    expect(response.body.data.plans[0].slug).toBe('basico')
    expect(response.body.data.plans[0].priceCents).toBe(0)
    expect(response.body.data.plans[0].maxProfiles).toBe(1)
    expect(response.body.data.plans[0].maxStreams).toBe(1)
    expect(response.body.error).toBeNull()
  })

  it('should return empty array when no active plans', async () => {
    const response = await request(app.getHttpServer()).get('/plans')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.plans).toHaveLength(0)
  })

  it('should not return inactive plans', async () => {
    plansRepository.items.push(
      Plan.create({
        name: 'Ativo',
        slug: 'ativo',
        priceCents: 0,
        maxProfiles: 1,
        maxStreams: 1,
      }),
      Plan.create({
        name: 'Inativo',
        slug: 'inativo',
        priceCents: 9990,
        maxProfiles: 10,
        maxStreams: 10,
        active: false,
      }),
    )

    const response = await request(app.getHttpServer()).get('/plans')

    expect(response.status).toBe(200)
    expect(response.body.data.plans).toHaveLength(1)
    expect(response.body.data.plans[0].slug).toBe('ativo')
  })
})
