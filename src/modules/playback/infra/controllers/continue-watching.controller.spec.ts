import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ContinueWatchingController } from './continue-watching.controller'
import { GetContinueWatchingUseCase } from '../../application/use-cases/get-continue-watching-use-case'
import { ProgressRepository } from '../../domain/repositories/progress-repository'
import { ProfileOwnershipGatewayPort } from '../../application/ports/profile-ownership-gateway.port'
import { InMemoryProgressRepository } from 'test/repositories/in-memory-progress-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { Progress } from '../../domain/entities/progress'

let app: INestApplication
let progressRepository: InMemoryProgressRepository
let ownershipGateway: {
  result: boolean
  validateOwnership: () => Promise<boolean>
}

const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('ContinueWatchingController', () => {
  beforeEach(async () => {
    ownershipGateway = {
      result: true,
      validateOwnership: async () => ownershipGateway.result,
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ContinueWatchingController],
      providers: [
        GetContinueWatchingUseCase,
        { provide: ProgressRepository, useClass: InMemoryProgressRepository },
        { provide: ProfileOwnershipGatewayPort, useValue: ownershipGateway },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    progressRepository = module.get(ProgressRepository)
  })

  it('should return 200 with continue watching items', async () => {
    progressRepository.items.push(
      Progress.create({
        profileId: PROFILE_ID,
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 3600,
        durationSeconds: 8340,
      }),
    )

    const response = await request(app.getHttpServer()).get(
      `/progress/${PROFILE_ID}/continue`,
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0].tmdbId).toBe(550)
    expect(response.body.data.items[0].progressSeconds).toBe(3600)
  })

  it('should return 404 when user does not own the profile', async () => {
    ownershipGateway.result = false

    const response = await request(app.getHttpServer()).get(
      `/progress/${PROFILE_ID}/continue`,
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
