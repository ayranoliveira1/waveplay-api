import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ToggleFavoriteController } from './toggle-favorite.controller'
import { ToggleFavoriteUseCase } from '../../application/use-cases/toggle-favorite-use-case'
import { FavoritesRepository } from '../../domain/repositories/favorites-repository'
import { ProfileOwnershipGatewayPort } from '../../application/ports/profile-ownership-gateway.port'
import { InMemoryFavoritesRepository } from 'test/repositories/in-memory-favorites-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { Favorite } from '../../domain/entities/favorite'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let app: INestApplication
let favoritesRepository: InMemoryFavoritesRepository
let ownershipGateway: {
  result: boolean
  validateOwnership: () => Promise<boolean>
}

const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('ToggleFavoriteController', () => {
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
      controllers: [ToggleFavoriteController],
      providers: [
        ToggleFavoriteUseCase,
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

  it('should return 200 and added true when adding a favorite', async () => {
    const response = await request(app.getHttpServer())
      .post(`/favorites/${PROFILE_ID}`)
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        rating: 8.4,
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.added).toBe(true)
    expect(favoritesRepository.items).toHaveLength(1)
  })

  it('should return 200 and added false when removing a favorite (toggle)', async () => {
    favoritesRepository.items.push(
      Favorite.create(
        {
          profileId: PROFILE_ID,
          tmdbId: 550,
          type: 'movie',
          title: 'Clube da Luta',
          rating: 8.4,
        },
        new UniqueEntityID('fav-1'),
      ),
    )

    const response = await request(app.getHttpServer())
      .post(`/favorites/${PROFILE_ID}`)
      .send({
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        rating: 8.4,
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.added).toBe(false)
    expect(favoritesRepository.items).toHaveLength(0)
  })

  it('should return 404 when user does not own the profile', async () => {
    ownershipGateway.result = false

    const response = await request(app.getHttpServer())
      .post(`/favorites/${PROFILE_ID}`)
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
