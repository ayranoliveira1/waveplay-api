import { describe, it, expect, beforeEach } from 'vitest'

import { GetSeriesDetailUseCase } from './get-series-detail-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
let cacheService: CatalogCacheService
let sut: GetSeriesDetailUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetSeriesDetailUseCase', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new GetSeriesDetailUseCase(cacheService)
  })

  it('should return series detail', async () => {
    const result = await sut.execute({ id: 1396 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.series.id).toBe(1396)
      expect(result.value.series.name).toBe('Breaking Bad')
    }
  })

  it('should return left when series not found', async () => {
    provider.seriesList = []

    const result = await sut.execute({ id: 999999 })

    expect(result.isLeft()).toBe(true)
  })
})
