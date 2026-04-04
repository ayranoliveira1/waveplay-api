import { describe, it, expect, beforeEach } from 'vitest'

import { ToggleWatchlistUseCase } from './toggle-watchlist-use-case'
import { InMemoryWatchlistRepository } from 'test/repositories/in-memory-watchlist-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { WatchlistItem } from '../../domain/entities/watchlist-item'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'

let watchlistRepository: InMemoryWatchlistRepository
let ownershipGateway: ProfileOwnershipGatewayPort & { result: boolean }
let sut: ToggleWatchlistUseCase

describe('ToggleWatchlistUseCase', () => {
  beforeEach(() => {
    watchlistRepository = new InMemoryWatchlistRepository()
    ownershipGateway = {
      result: true,
      validateOwnership: async () => ownershipGateway.result,
    }
    sut = new ToggleWatchlistUseCase(watchlistRepository, ownershipGateway)
  })

  it('should add to watchlist when it does not exist', async () => {
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
    expect(watchlistRepository.items).toHaveLength(1)
  })

  it('should remove from watchlist when it already exists (toggle)', async () => {
    watchlistRepository.items.push(
      WatchlistItem.create(
        {
          profileId: 'profile-1',
          tmdbId: 550,
          type: 'movie',
          title: 'Clube da Luta',
          rating: 8.4,
        },
        new UniqueEntityID('wl-1'),
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
    expect(watchlistRepository.items).toHaveLength(0)
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
