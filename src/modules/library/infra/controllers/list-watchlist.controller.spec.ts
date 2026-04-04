import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ListWatchlistController } from './list-watchlist.controller'
import { ListWatchlistUseCase } from '../../application/use-cases/list-watchlist-use-case'
import { WatchlistRepository } from '../../domain/repositories/watchlist-repository'
import { ProfileOwnershipGatewayPort } from '../../application/ports/profile-ownership-gateway.port'
import { InMemoryWatchlistRepository } from 'test/repositories/in-memory-watchlist-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { WatchlistItem } from '../../domain/entities/watchlist-item'

let app: INestApplication
let watchlistRepository: InMemoryWatchlistRepository
let ownershipGateway: { result: boolean; validateOwnership: () => Promise<boolean> }

const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('ListWatchlistController', () => {
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
      controllers: [ListWatchlistController],
      providers: [
        ListWatchlistUseCase,
        { provide: WatchlistRepository, useClass: InMemoryWatchlistRepository },
        { provide: ProfileOwnershipGatewayPort, useValue: ownershipGateway },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    watchlistRepository = module.get(WatchlistRepository)
  })

  it('should return 200 with paginated watchlist items', async () => {
    watchlistRepository.items.push(
      WatchlistItem.create({ profileId: PROFILE_ID, tmdbId: 550, type: 'movie', title: 'Clube da Luta', rating: 8.4 }),
      WatchlistItem.create({ profileId: PROFILE_ID, tmdbId: 1396, type: 'series', title: 'Breaking Bad', rating: 8.9 }),
    )

    const response = await request(app.getHttpServer()).get(
      `/watchlist/${PROFILE_ID}?page=1`,
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.results).toHaveLength(2)
    expect(response.body.data.results[0].tmdbId).toBeDefined()
    expect(response.body.data.results[0].title).toBeDefined()
    expect(response.body.data.page).toBe(1)
    expect(response.body.data.totalPages).toBe(1)
  })

  it('should return 404 when user does not own the profile', async () => {
    ownershipGateway.result = false

    const response = await request(app.getHttpServer()).get(
      `/watchlist/${PROFILE_ID}?page=1`,
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
