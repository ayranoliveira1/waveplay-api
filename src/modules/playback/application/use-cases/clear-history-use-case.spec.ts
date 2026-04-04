import { describe, it, expect, beforeEach } from 'vitest'

import { ClearHistoryUseCase } from './clear-history-use-case'
import { InMemoryHistoryRepository } from 'test/repositories/in-memory-history-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { HistoryItem } from '../../domain/entities/history-item'
import type { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'

let historyRepository: InMemoryHistoryRepository
let ownershipGateway: ProfileOwnershipGatewayPort & { result: boolean }
let sut: ClearHistoryUseCase

describe('ClearHistoryUseCase', () => {
  beforeEach(() => {
    historyRepository = new InMemoryHistoryRepository()
    ownershipGateway = {
      result: true,
      validateOwnership: async () => ownershipGateway.result,
    }
    sut = new ClearHistoryUseCase(historyRepository, ownershipGateway)
  })

  it('should clear all history for the profile', async () => {
    historyRepository.items.push(
      HistoryItem.create({
        profileId: 'profile-1',
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
      }),
      HistoryItem.create({
        profileId: 'profile-1',
        tmdbId: 1396,
        type: 'series',
        title: 'Breaking Bad',
        season: 1,
        episode: 1,
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
    })

    expect(result.isRight()).toBe(true)
    expect(historyRepository.items).toHaveLength(0)
  })

  it('should return error when user does not own the profile', async () => {
    ownershipGateway.result = false

    const result = await sut.execute({
      userId: 'user-2',
      profileId: 'profile-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProfileNotFoundError)
  })
})
