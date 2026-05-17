import { describe, it, expect, beforeEach } from 'vitest'

import { GetLiveBroadcastsUseCase } from './get-live-broadcasts-use-case'
import { SportsCacheService } from '../../infra/sports-cache.service'
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
let sut: GetLiveBroadcastsUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetLiveBroadcastsUseCase', () => {
  beforeEach(() => {
    sportsProvider = new FakeSportsProvider()
    youtubeProvider = new FakeYouTubeBroadcastProvider()
    cacheService = new SportsCacheService(
      fakeRedis,
      sportsProvider,
      youtubeProvider,
    )
    sut = new GetLiveBroadcastsUseCase(cacheService)
  })

  it('should return empty when there are no YouTube lives', async () => {
    youtubeProvider.lives = []
    sportsProvider.matches = [makeFakeMatch()]

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.broadcasts).toEqual([])
  })

  it('should pair a YouTube live with the matching football-data match', async () => {
    youtubeProvider.lives = [
      makeFakeYouTubeLive({ title: 'AO VIVO 🔴 Palmeiras x São Paulo' }),
    ]
    sportsProvider.matches = [makeFakeMatch()]

    const result = await sut.execute()

    expect(result.value.broadcasts).toHaveLength(1)
    expect(result.value.broadcasts[0].youtube.videoId).toBe('abc123')
    expect(result.value.broadcasts[0].match.homeTeam.shortName).toBe(
      'Palmeiras',
    )
    expect(result.value.broadcasts[0].match.awayTeam.shortName).toBe(
      'São Paulo',
    )
  })

  it('should discard YouTube lives that cannot be parsed as match titles', async () => {
    youtubeProvider.lives = [
      makeFakeYouTubeLive({ title: 'Análise pós-jogo - Cazé Tube' }),
    ]
    sportsProvider.matches = [makeFakeMatch()]

    const result = await sut.execute()

    expect(result.value.broadcasts).toEqual([])
  })

  it('should discard YouTube lives that do not match any football-data match', async () => {
    youtubeProvider.lives = [
      makeFakeYouTubeLive({ title: 'AO VIVO Time A x Time B' }),
    ]
    sportsProvider.matches = [makeFakeMatch()]

    const result = await sut.execute()

    expect(result.value.broadcasts).toEqual([])
  })

  it('should produce one broadcast per YouTube live that pairs with a match', async () => {
    youtubeProvider.lives = [
      makeFakeYouTubeLive({
        videoId: 'a',
        title: 'AO VIVO Palmeiras x São Paulo',
      }),
      makeFakeYouTubeLive({
        videoId: 'b',
        title: 'Pós-jogo Palmeiras vs São Paulo',
      }),
    ]
    sportsProvider.matches = [makeFakeMatch()]

    const result = await sut.execute()

    expect(result.value.broadcasts).toHaveLength(2)
  })
})
