import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ClearHistoryController } from './clear-history.controller'
import { ClearHistoryUseCase } from '../../application/use-cases/clear-history-use-case'
import { HistoryRepository } from '../../domain/repositories/history-repository'
import { ProfileOwnershipGatewayPort } from '../../application/ports/profile-ownership-gateway.port'
import { InMemoryHistoryRepository } from 'test/repositories/in-memory-history-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { HistoryItem } from '../../domain/entities/history-item'

let app: INestApplication
let historyRepository: InMemoryHistoryRepository
let ownershipGateway: {
  result: boolean
  validateOwnership: () => Promise<boolean>
}

const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('ClearHistoryController', () => {
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
      controllers: [ClearHistoryController],
      providers: [
        ClearHistoryUseCase,
        { provide: HistoryRepository, useClass: InMemoryHistoryRepository },
        { provide: ProfileOwnershipGatewayPort, useValue: ownershipGateway },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    historyRepository = module.get(HistoryRepository)
  })

  it('should return 200 when clearing history', async () => {
    historyRepository.items.push(
      HistoryItem.create({
        profileId: PROFILE_ID,
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
      }),
      HistoryItem.create({
        profileId: PROFILE_ID,
        tmdbId: 1396,
        type: 'series',
        title: 'Breaking Bad',
        season: 1,
        episode: 1,
      }),
    )

    const response = await request(app.getHttpServer()).delete(
      `/history/${PROFILE_ID}`,
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toBeNull()
    expect(historyRepository.items).toHaveLength(0)
  })

  it('should return 404 when user does not own the profile', async () => {
    ownershipGateway.result = false

    const response = await request(app.getHttpServer()).delete(
      `/history/${PROFILE_ID}`,
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
