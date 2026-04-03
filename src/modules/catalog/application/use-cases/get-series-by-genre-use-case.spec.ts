import { describe, it, expect, beforeEach } from 'vitest'

import { GetSeriesByGenreUseCase } from './get-series-by-genre-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
let cacheService: CatalogCacheService
let sut: GetSeriesByGenreUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetSeriesByGenreUseCase', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new GetSeriesByGenreUseCase(cacheService)
  })

  it('should return series by genre with pagination', async () => {
    const result = await sut.execute({ genreId: 18, page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(1)
    expect(result.value.page).toBe(1)
    expect(result.value.totalPages).toBe(1)
  })

  it('should return empty results when no series for genre', async () => {
    provider.seriesList = []

    const result = await sut.execute({ genreId: 18, page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(0)
  })
})
