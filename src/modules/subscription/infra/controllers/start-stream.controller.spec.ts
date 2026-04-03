import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { StartStreamController } from './start-stream.controller'
import { StartStreamUseCase } from '../../application/use-cases/start-stream-use-case'
import { ActiveStreamsRepository } from '../../domain/repositories/active-streams-repository'
import { SubscriptionsRepository } from '../../domain/repositories/subscriptions-repository'
import { PlansRepository } from '../../domain/repositories/plans-repository'
import { ProfileOwnershipGatewayPort } from '../../application/ports/profile-ownership-gateway.port'
import { InMemoryActiveStreamsRepository } from 'test/repositories/in-memory-active-streams-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { FakeProfileOwnershipGateway } from 'test/ports/fake-profile-ownership-gateway'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { Plan } from '../../domain/entities/plan'
import { Subscription } from '../../domain/entities/subscription'
import { ActiveStream } from '../../domain/entities/active-stream'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let app: INestApplication
let activeStreamsRepository: InMemoryActiveStreamsRepository
let profileOwnershipGateway: FakeProfileOwnershipGateway

describe('StartStreamController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [StartStreamController],
      providers: [
        StartStreamUseCase,
        {
          provide: ActiveStreamsRepository,
          useClass: InMemoryActiveStreamsRepository,
        },
        {
          provide: SubscriptionsRepository,
          useClass: InMemorySubscriptionsRepository,
        },
        { provide: PlansRepository, useClass: InMemoryPlansRepository },
        {
          provide: ProfileOwnershipGatewayPort,
          useClass: FakeProfileOwnershipGateway,
        },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    activeStreamsRepository = module.get(ActiveStreamsRepository)
    profileOwnershipGateway = module.get(ProfileOwnershipGatewayPort)

    const plansRepository = module.get<InMemoryPlansRepository>(PlansRepository)
    const subscriptionsRepository = module.get<InMemorySubscriptionsRepository>(
      SubscriptionsRepository,
    )

    plansRepository.items.push(
      Plan.create(
        {
          name: 'Padrão',
          slug: 'padrao',
          priceCents: 1990,
          maxProfiles: 3,
          maxStreams: 2,
        },
        new UniqueEntityID('plan-1'),
      ),
    )

    subscriptionsRepository.items.push(
      Subscription.create({
        userId: FakeAuthGuard.userId,
        planId: 'plan-1',
      }),
    )
  })

  it('should return 201 with streamId', async () => {
    const response = await request(app.getHttpServer())
      .post('/streams/start')
      .send({
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        tmdbId: 550,
        type: 'movie',
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.streamId).toBeDefined()
    expect(response.body.error).toBeNull()
  })

  it('should return 400 when body is invalid', async () => {
    const response = await request(app.getHttpServer())
      .post('/streams/start')
      .send({ profileId: 'not-a-uuid', tmdbId: -1, type: 'invalid' })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 403 when stream limit is reached', async () => {
    activeStreamsRepository.items.push(
      ActiveStream.create({
        userId: FakeAuthGuard.userId,
        profileId: 'profile-1',
        tmdbId: 100,
        type: 'movie',
      }),
      ActiveStream.create({
        userId: FakeAuthGuard.userId,
        profileId: 'profile-2',
        tmdbId: 200,
        type: 'series',
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/streams/start')
      .send({
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        tmdbId: 300,
        type: 'movie',
      })

    expect(response.status).toBe(403)
    expect(response.body.success).toBe(false)
  })

  it('should return 404 when profile does not belong to user (IDOR)', async () => {
    profileOwnershipGateway.result = false

    const response = await request(app.getHttpServer())
      .post('/streams/start')
      .send({
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        tmdbId: 550,
        type: 'movie',
      })

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
