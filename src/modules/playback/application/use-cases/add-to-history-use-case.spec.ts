import { describe, it, expect, beforeEach } from 'vitest'

import { AddToHistoryUseCase } from './add-to-history-use-case'
import { InMemoryHistoryRepository } from 'test/repositories/in-memory-history-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { HistoryItem } from '../../domain/entities/history-item'
import type { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'

let historyRepository: InMemoryHistoryRepository
let ownershipGateway: ProfileOwnershipGatewayPort & { result: boolean }
let sut: AddToHistoryUseCase

describe('AddToHistoryUseCase', () => {
  beforeEach(() => {
    historyRepository = new InMemoryHistoryRepository()
    ownershipGateway = {
      result: true,
      validateOwnership: async () => ownershipGateway.result,
    }
    sut = new AddToHistoryUseCase(historyRepository, ownershipGateway)
  })

  it('should add item to history', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
      title: 'Clube da Luta',
    })

    expect(result.isRight()).toBe(true)
    expect(historyRepository.items).toHaveLength(1)
  })

  it('should upsert when item already exists', async () => {
    historyRepository.items.push(
      HistoryItem.create({
        profileId: 'profile-1',
        tmdbId: 550,
        type: 'movie',
        title: 'Clube da Luta',
        watchedAt: new Date('2026-01-01'),
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
      title: 'Clube da Luta',
    })

    expect(result.isRight()).toBe(true)
    expect(historyRepository.items).toHaveLength(1)
  })

  it('should return error when user does not own the profile', async () => {
    ownershipGateway.result = false

    const result = await sut.execute({
      userId: 'user-2',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
      title: 'Clube da Luta',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProfileNotFoundError)
  })
})
