import { describe, it, expect, beforeEach } from 'vitest'

import { SaveProgressUseCase } from './save-progress-use-case'
import { InMemoryProgressRepository } from 'test/repositories/in-memory-progress-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { Progress } from '../../domain/entities/progress'
import type { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'

let progressRepository: InMemoryProgressRepository
let ownershipGateway: ProfileOwnershipGatewayPort & { result: boolean }
let sut: SaveProgressUseCase

describe('SaveProgressUseCase', () => {
  beforeEach(() => {
    progressRepository = new InMemoryProgressRepository()
    ownershipGateway = {
      result: true,
      validateOwnership: async () => ownershipGateway.result,
    }
    sut = new SaveProgressUseCase(progressRepository, ownershipGateway)
  })

  it('should create progress when it does not exist', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
      progressSeconds: 3600,
      durationSeconds: 8340,
    })

    expect(result.isRight()).toBe(true)
    expect(progressRepository.items).toHaveLength(1)
    expect(progressRepository.items[0].progressSeconds).toBe(3600)
  })

  it('should update progress when it already exists (upsert)', async () => {
    progressRepository.items.push(
      Progress.create({
        profileId: 'profile-1',
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 1800,
        durationSeconds: 8340,
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
      progressSeconds: 5000,
      durationSeconds: 8340,
    })

    expect(result.isRight()).toBe(true)
    expect(progressRepository.items).toHaveLength(1)
    expect(progressRepository.items[0].progressSeconds).toBe(5000)
  })

  it('should return error when user does not own the profile', async () => {
    ownershipGateway.result = false

    const result = await sut.execute({
      userId: 'user-2',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
      progressSeconds: 3600,
      durationSeconds: 8340,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProfileNotFoundError)
  })
})
