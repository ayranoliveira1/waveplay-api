import { describe, it, expect, beforeEach } from 'vitest'

import { GetSeasonEpisodesUseCase } from './get-season-episodes-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
let cacheService: CatalogCacheService
let sut: GetSeasonEpisodesUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetSeasonEpisodesUseCase', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new GetSeasonEpisodesUseCase(cacheService)
  })

  it('should return season episodes', async () => {
    const result = await sut.execute({ seriesId: 1396, seasonNumber: 1 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.episodes).toHaveLength(1)
      expect(result.value.episodes[0].name).toBe('Pilot')
    }
  })

  it('should return left when season not found', async () => {
    provider.episodes = []

    const result = await sut.execute({ seriesId: 1396, seasonNumber: 99 })

    expect(result.isLeft()).toBe(true)
  })
})
