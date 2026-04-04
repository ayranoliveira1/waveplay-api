import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ListFavoritesController } from './list-favorites.controller'
import { ListFavoritesUseCase } from '../../application/use-cases/list-favorites-use-case'
import { FavoritesRepository } from '../../domain/repositories/favorites-repository'
import { ProfileOwnershipGatewayPort } from '../../application/ports/profile-ownership-gateway.port'
import { InMemoryFavoritesRepository } from 'test/repositories/in-memory-favorites-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { Favorite } from '../../domain/entities/favorite'

let app: INestApplication
let favoritesRepository: InMemoryFavoritesRepository
let ownershipGateway: {
  result: boolean
  validateOwnership: () => Promise<boolean>
}

const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('ListFavoritesController', () => {
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
      controllers: [ListFavoritesController],
      providers: [
        ListFavoritesUseCase,
        { provide: FavoritesRepository, useClass: InMemoryFavoritesRepository },
        { provide: ProfileOwnershipGatewayPort, useValue: ownershipGateway },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    favoritesRepository = module.get(FavoritesRepository)
  })

  it('should return 200 with paginated favorites', async () => {
    favoritesRepository.items.push(
      Favorite.create({
        profileId: PROFILE_ID,
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        rating: 8.4,
      }),
      Favorite.create({
        profileId: PROFILE_ID,
        tmdbId: 1396,
        type: 'series',
        title: 'Breaking Bad',
        rating: 8.9,
      }),
    )

    const response = await request(app.getHttpServer()).get(
      `/favorites/${PROFILE_ID}?page=1`,
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.favorites).toHaveLength(2)
    expect(response.body.data.favorites[0].tmdbId).toBeDefined()
    expect(response.body.data.favorites[0].title).toBeDefined()
    expect(response.body.data.page).toBe(1)
    expect(response.body.data.totalPages).toBe(1)
  })

  it('should return 404 when user does not own the profile', async () => {
    ownershipGateway.result = false

    const response = await request(app.getHttpServer()).get(
      `/favorites/${PROFILE_ID}?page=1`,
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
