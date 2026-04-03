import { describe, it, expect, beforeEach } from 'vitest'

import { GetTrendingUseCase } from './get-trending-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import {
  FakeCatalogProvider,
  makeFakeMultiResult,
} from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
let cacheService: CatalogCacheService
let sut: GetTrendingUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetTrendingUseCase', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new GetTrendingUseCase(cacheService)
  })

  it('should return trending results with pagination', async () => {
    provider.multiResults = [
      makeFakeMultiResult({ id: 1 }),
      makeFakeMultiResult({ id: 2 }),
    ]

    const result = await sut.execute({ page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(2)
    expect(result.value.page).toBe(1)
    expect(result.value.totalPages).toBe(1)
  })

  it('should return empty results when no trending items', async () => {
    provider.multiResults = []

    const result = await sut.execute({ page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(0)
  })
})
