import { describe, it, expect, beforeEach } from 'vitest'

import { ToggleFavoriteUseCase } from './toggle-favorite-use-case'
import { InMemoryFavoritesRepository } from 'test/repositories/in-memory-favorites-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { Favorite } from '../../domain/entities/favorite'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'

let favoritesRepository: InMemoryFavoritesRepository
let ownershipGateway: ProfileOwnershipGatewayPort & { result: boolean }
let sut: ToggleFavoriteUseCase

describe('ToggleFavoriteUseCase', () => {
  beforeEach(() => {
    favoritesRepository = new InMemoryFavoritesRepository()
    ownershipGateway = { result: true, validateOwnership: async () => ownershipGateway.result }
    sut = new ToggleFavoriteUseCase(favoritesRepository, ownershipGateway)
  })

  it('should add a favorite when it does not exist', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
      title: 'Clube da Luta',
      rating: 8.4,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.added).toBe(true)
    }
    expect(favoritesRepository.items).toHaveLength(1)
  })

  it('should remove a favorite when it already exists (toggle)', async () => {
    favoritesRepository.items.push(
      Favorite.create(
        { profileId: 'profile-1', tmdbId: 550, type: 'movie', title: 'Clube da Luta', rating: 8.4 },
        new UniqueEntityID('fav-1'),
      ),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
      title: 'Clube da Luta',
      rating: 8.4,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.added).toBe(false)
    }
    expect(favoritesRepository.items).toHaveLength(0)
  })

  it('should return error when user does not own the profile', async () => {
    ownershipGateway.result = false

    const result = await sut.execute({
      userId: 'user-2',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
      title: 'Clube da Luta',
      rating: 8.4,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProfileNotFoundError)
  })
})
