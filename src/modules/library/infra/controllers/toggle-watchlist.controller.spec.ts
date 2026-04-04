import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ToggleWatchlistController } from './toggle-watchlist.controller'
import { ToggleWatchlistUseCase } from '../../application/use-cases/toggle-watchlist-use-case'
import { WatchlistRepository } from '../../domain/repositories/watchlist-repository'
import { ProfileOwnershipGatewayPort } from '../../application/ports/profile-ownership-gateway.port'
import { InMemoryWatchlistRepository } from 'test/repositories/in-memory-watchlist-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { WatchlistItem } from '../../domain/entities/watchlist-item'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let app: INestApplication
let watchlistRepository: InMemoryWatchlistRepository
let ownershipGateway: { result: boolean; validateOwnership: () => Promise<boolean> }

const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('ToggleWatchlistController', () => {
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
      controllers: [ToggleWatchlistController],
      providers: [
        ToggleWatchlistUseCase,
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

  it('should return 200 and added true when adding to watchlist', async () => {
    const response = await request(app.getHttpServer())
      .post(`/watchlist/${PROFILE_ID}`)
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        rating: 8.4,
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.added).toBe(true)
    expect(watchlistRepository.items).toHaveLength(1)
  })

  it('should return 200 and added false when removing from watchlist (toggle)', async () => {
    watchlistRepository.items.push(
      WatchlistItem.create(
        {
          profileId: PROFILE_ID,
          tmdbId: 550,
          type: 'movie',
          title: 'Clube da Luta',
          rating: 8.4,
        },
        new UniqueEntityID('wl-1'),
      ),
    )

    const response = await request(app.getHttpServer())
      .post(`/watchlist/${PROFILE_ID}`)
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        rating: 8.4,
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.added).toBe(false)
    expect(watchlistRepository.items).toHaveLength(0)
  })

  it('should return 404 when user does not own the profile', async () => {
    ownershipGateway.result = false

    const response = await request(app.getHttpServer())
      .post(`/watchlist/${PROFILE_ID}`)
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        rating: 8.4,
      })

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
