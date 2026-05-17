import { describe, it, expect, beforeEach } from 'vitest'

import { GetMatchDetailUseCase } from './get-match-detail-use-case'
import { SportsCacheService } from '../../infra/sports-cache.service'
import { ResourceNotFoundError } from '@/core/errors/errors/resource-not-found-error'
import {
  FakeSportsProvider,
  makeFakeMatch,
} from 'test/providers/fake-sports-provider'
import {
  FakeYouTubeBroadcastProvider,
  makeFakeYouTubeLive,
} from 'test/providers/fake-youtube-broadcast-provider'

let sportsProvider: FakeSportsProvider
let youtubeProvider: FakeYouTubeBroadcastProvider
let cacheService: SportsCacheService
let sut: GetMatchDetailUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetMatchDetailUseCase', () => {
  beforeEach(() => {
    sportsProvider = new FakeSportsProvider()
    youtubeProvider = new FakeYouTubeBroadcastProvider()
    cacheService = new SportsCacheService(
      fakeRedis,
      sportsProvider,
      youtubeProvider,
    )
    sut = new GetMatchDetailUseCase(cacheService)
  })

  it('should return match with youtube when there is an active matching live', async () => {
    sportsProvider.matches = [makeFakeMatch({ id: 419123 })]
    youtubeProvider.lives = [
      makeFakeYouTubeLive({ title: 'AO VIVO Palmeiras x São Paulo' }),
    ]

    const result = await sut.execute({ id: 419123 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.match.id).toBe(419123)
      expect(result.value.youtube?.videoId).toBe('abc123')
    }
  })

  it('should return match with youtube null when no active live matches', async () => {
    sportsProvider.matches = [makeFakeMatch({ id: 419123 })]
    youtubeProvider.lives = []

    const result = await sut.execute({ id: 419123 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.match.id).toBe(419123)
      expect(result.value.youtube).toBeNull()
    }
  })

  it('should return ResourceNotFoundError when match does not exist', async () => {
    sportsProvider.matches = []

    const result = await sut.execute({ id: 999 })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('should not pair youtube live that does not parse as a match title', async () => {
    sportsProvider.matches = [makeFakeMatch({ id: 419123 })]
    youtubeProvider.lives = [makeFakeYouTubeLive({ title: 'Análise pós-jogo' })]

    const result = await sut.execute({ id: 419123 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.youtube).toBeNull()
    }
  })
})
