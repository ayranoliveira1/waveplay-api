import { describe, it, expect, beforeEach } from 'vitest'

import { GetByWatchProvidersUseCase } from './get-by-watch-providers-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import {
  FakeCatalogProvider,
  makeFakeMovie,
  makeFakeSeries,
} from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
let cacheService: CatalogCacheService
let sut: GetByWatchProvidersUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetByWatchProvidersUseCase', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new GetByWatchProvidersUseCase(cacheService)
  })

  it('should return merged movies and series ordered by popularity desc', async () => {
    provider.movies = [
      makeFakeMovie({ id: 1, popularity: 50 }),
      makeFakeMovie({ id: 2, popularity: 100 }),
    ]
    provider.seriesList = [
      makeFakeSeries({ id: 10, popularity: 75 }),
      makeFakeSeries({ id: 11, popularity: 25 }),
    ]

    const result = await sut.execute({ providers: [8], page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(4)
    expect(result.value.results[0].id).toBe(2)
    expect(result.value.results[1].id).toBe(10)
    expect(result.value.results[2].id).toBe(1)
    expect(result.value.results[3].id).toBe(11)
  })

  it('should mix movie and series types in the same list', async () => {
    provider.movies = [makeFakeMovie({ id: 1, popularity: 100 })]
    provider.seriesList = [makeFakeSeries({ id: 10, popularity: 50 })]

    const result = await sut.execute({ providers: [8], page: 1 })

    const types = result.value.results.map((r) => r.type)
    expect(types).toContain('movie')
    expect(types).toContain('series')
  })

  it('should slice merged results to top 20', async () => {
    provider.movies = Array.from({ length: 15 }, (_, i) =>
      makeFakeMovie({ id: 100 + i, popularity: 1 + i }),
    )
    provider.seriesList = Array.from({ length: 15 }, (_, i) =>
      makeFakeSeries({ id: 200 + i, popularity: 50 + i }),
    )

    const result = await sut.execute({ providers: [8], page: 1 })

    expect(result.value.results).toHaveLength(20)
  })

  it('should propagate page and totalPages', async () => {
    const result = await sut.execute({ providers: [8], page: 3 })

    expect(result.value.page).toBe(3)
    expect(result.value.totalPages).toBeGreaterThanOrEqual(1)
  })

  it('should accept multiple provider ids', async () => {
    const result = await sut.execute({ providers: [8, 337], page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results.length).toBeGreaterThan(0)
  })

  it('should default popularity to 0 when missing', async () => {
    provider.movies = [makeFakeMovie({ id: 1 })]
    provider.seriesList = [makeFakeSeries({ id: 10 })]

    const result = await sut.execute({ providers: [8], page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(2)
  })
})
