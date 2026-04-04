import { describe, it, expect, beforeEach } from 'vitest'

import { GetContinueWatchingUseCase } from './get-continue-watching-use-case'
import { InMemoryProgressRepository } from 'test/repositories/in-memory-progress-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { Progress } from '../../domain/entities/progress'
import type { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'

let progressRepository: InMemoryProgressRepository
let ownershipGateway: ProfileOwnershipGatewayPort & { result: boolean }
let sut: GetContinueWatchingUseCase

describe('GetContinueWatchingUseCase', () => {
  beforeEach(() => {
    progressRepository = new InMemoryProgressRepository()
    ownershipGateway = {
      result: true,
      validateOwnership: async () => ownershipGateway.result,
    }
    sut = new GetContinueWatchingUseCase(progressRepository, ownershipGateway)
  })

  it('should return items with progress > 0% and < 90%', async () => {
    progressRepository.items.push(
      Progress.create({
        profileId: 'profile-1',
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 3600,
        durationSeconds: 8340,
      }),
      Progress.create({
        profileId: 'profile-1',
        tmdbId: 1396,
        type: 'series',
        season: 1,
        episode: 3,
        progressSeconds: 1800,
        durationSeconds: 3480,
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(2)
    }
  })

  it('should exclude items with progress >= 90%', async () => {
    progressRepository.items.push(
      Progress.create({
        profileId: 'profile-1',
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 7800,
        durationSeconds: 8340,
      }),
      Progress.create({
        profileId: 'profile-1',
        tmdbId: 1396,
        type: 'series',
        season: 1,
        episode: 3,
        progressSeconds: 1800,
        durationSeconds: 3480,
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
      expect(result.value.items[0].tmdbId).toBe(1396)
    }
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
