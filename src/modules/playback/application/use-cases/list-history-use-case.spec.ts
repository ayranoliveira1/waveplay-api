import { describe, it, expect, beforeEach } from 'vitest'

import { ListHistoryUseCase } from './list-history-use-case'
import { InMemoryHistoryRepository } from 'test/repositories/in-memory-history-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { HistoryItem } from '../../domain/entities/history-item'
import type { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'

let historyRepository: InMemoryHistoryRepository
let ownershipGateway: ProfileOwnershipGatewayPort & { result: boolean }
let sut: ListHistoryUseCase

describe('ListHistoryUseCase', () => {
  beforeEach(() => {
    historyRepository = new InMemoryHistoryRepository()
    ownershipGateway = {
      result: true,
      validateOwnership: async () => ownershipGateway.result,
    }
    sut = new ListHistoryUseCase(historyRepository, ownershipGateway)
  })

  it('should return paginated history ordered by watchedAt', async () => {
    historyRepository.items.push(
      HistoryItem.create({
        profileId: 'profile-1',
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        watchedAt: new Date('2026-04-01'),
      }),
      HistoryItem.create({
        profileId: 'profile-1',
        tmdbId: 1396,
        type: 'series',
        title: 'Breaking Bad',
        season: 1,
        episode: 1,
        watchedAt: new Date('2026-04-02'),
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      page: 1,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(2)
      expect(result.value.items[0].tmdbId).toBe(1396)
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
