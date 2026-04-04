import { describe, it, expect, beforeEach } from 'vitest'

import { ListFavoritesUseCase } from './list-favorites-use-case'
import { InMemoryFavoritesRepository } from 'test/repositories/in-memory-favorites-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { Favorite } from '../../domain/entities/favorite'
import type { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'

let favoritesRepository: InMemoryFavoritesRepository
let ownershipGateway: ProfileOwnershipGatewayPort & { result: boolean }
let sut: ListFavoritesUseCase

describe('ListFavoritesUseCase', () => {
  beforeEach(() => {
    favoritesRepository = new InMemoryFavoritesRepository()
    ownershipGateway = {
      result: true,
      validateOwnership: async () => ownershipGateway.result,
    }
    sut = new ListFavoritesUseCase(favoritesRepository, ownershipGateway)
  })

  it('should return paginated favorites', async () => {
    favoritesRepository.items.push(
      Favorite.create({
        profileId: 'profile-1',
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        rating: 8.4,
      }),
      Favorite.create({
        profileId: 'profile-1',
        tmdbId: 1396,
        type: 'series',
        title: 'Breaking Bad',
        rating: 8.9,
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      page: 1,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.favorites).toHaveLength(2)
      expect(result.value.page).toBe(1)
      expect(result.value.totalPages).toBe(1)
    }
  })

  it('should return error when user does not own the profile', async () => {
    ownershipGateway.result = false

    const result = await sut.execute({
      userId: 'user-2',
      profileId: 'profile-1',
      page: 1,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProfileNotFoundError)
  })
})
