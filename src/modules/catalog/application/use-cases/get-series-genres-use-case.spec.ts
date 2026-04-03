import { describe, it, expect, beforeEach } from 'vitest'

import { GetSeriesGenresUseCase } from './get-series-genres-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'

let cacheService: CatalogCacheService
let sut: GetSeriesGenresUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetSeriesGenresUseCase', () => {
  beforeEach(() => {
    const provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new GetSeriesGenresUseCase(cacheService)
  })

  it('should return series genres', async () => {
    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.genres).toHaveLength(2)
    expect(result.value.genres[0]).toHaveProperty('id')
    expect(result.value.genres[0]).toHaveProperty('name')
  })
})
