import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ListHistoryController } from './list-history.controller'
import { ListHistoryUseCase } from '../../application/use-cases/list-history-use-case'
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

describe('ListHistoryController', () => {
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
      controllers: [ListHistoryController],
      providers: [
        ListHistoryUseCase,
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

  it('should return 200 with paginated history', async () => {
    historyRepository.items.push(
      HistoryItem.create({
        profileId: PROFILE_ID,
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        posterPath: '/pB8BM7pdSp6B6Ih7QI4S2t0POsFj.jpg',
        progressSeconds: 8340,
        durationSeconds: 8340,
      }),
    )

    const response = await request(app.getHttpServer()).get(
      `/history/${PROFILE_ID}?page=1`,
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0].tmdbId).toBe(550)
    expect(response.body.data.items[0].title).toBe('Clube da Luta')
    expect(response.body.data.page).toBe(1)
    expect(response.body.data.totalPages).toBe(1)
  })

  it('should return 404 when user does not own the profile', async () => {
    ownershipGateway.result = false

    const response = await request(app.getHttpServer()).get(
      `/history/${PROFILE_ID}?page=1`,
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
