import { describe, it, expect, beforeEach } from 'vitest'

import { GetOnTheAirSeriesUseCase } from './get-on-the-air-series-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
let cacheService: CatalogCacheService
let sut: GetOnTheAirSeriesUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetOnTheAirSeriesUseCase', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new GetOnTheAirSeriesUseCase(cacheService)
  })

  it('should return on the air series with pagination', async () => {
    const result = await sut.execute({ page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(1)
    expect(result.value.page).toBe(1)
    expect(result.value.totalPages).toBe(1)
  })

  it('should return empty results when no series', async () => {
    provider.seriesList = []

    const result = await sut.execute({ page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(0)
  })
})
