import { describe, it, expect, beforeEach } from 'vitest'

import { ListWatchlistUseCase } from './list-watchlist-use-case'
import { InMemoryWatchlistRepository } from 'test/repositories/in-memory-watchlist-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { WatchlistItem } from '../../domain/entities/watchlist-item'
import type { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'

let watchlistRepository: InMemoryWatchlistRepository
let ownershipGateway: ProfileOwnershipGatewayPort & { result: boolean }
let sut: ListWatchlistUseCase

describe('ListWatchlistUseCase', () => {
  beforeEach(() => {
    watchlistRepository = new InMemoryWatchlistRepository()
    ownershipGateway = { result: true, validateOwnership: async () => ownershipGateway.result }
    sut = new ListWatchlistUseCase(watchlistRepository, ownershipGateway)
  })

  it('should return paginated watchlist items', async () => {
    watchlistRepository.items.push(
      WatchlistItem.create({ profileId: 'profile-1', tmdbId: 550, type: 'movie', title: 'Clube da Luta', rating: 8.4 }),
      WatchlistItem.create({ profileId: 'profile-1', tmdbId: 1396, type: 'series', title: 'Breaking Bad', rating: 8.9 }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      page: 1,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(2)
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
