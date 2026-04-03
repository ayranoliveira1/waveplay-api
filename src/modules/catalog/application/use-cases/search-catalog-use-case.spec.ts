import { describe, it, expect, beforeEach } from 'vitest'

import { SearchCatalogUseCase } from './search-catalog-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import {
  FakeCatalogProvider,
  makeFakeMultiResult,
} from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
let cacheService: CatalogCacheService
let sut: SearchCatalogUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('SearchCatalogUseCase', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new SearchCatalogUseCase(cacheService)
  })

  it('should return search results for a query', async () => {
    provider.multiResults = [
      makeFakeMultiResult({ id: 1, title: 'Breaking Bad', media_type: 'tv' }),
    ]

    const result = await sut.execute({ query: 'breaking', page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(1)
    expect(result.value.page).toBe(1)
  })

  it('should return empty results when nothing matches', async () => {
    provider.multiResults = []

    const result = await sut.execute({ query: 'xyznotfound', page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(0)
  })
})
