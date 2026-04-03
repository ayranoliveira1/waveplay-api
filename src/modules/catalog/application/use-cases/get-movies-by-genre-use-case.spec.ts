import { describe, it, expect, beforeEach } from 'vitest'

import { GetMoviesByGenreUseCase } from './get-movies-by-genre-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
let cacheService: CatalogCacheService
let sut: GetMoviesByGenreUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetMoviesByGenreUseCase', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new GetMoviesByGenreUseCase(cacheService)
  })

  it('should return movies by genre with pagination', async () => {
    const result = await sut.execute({ genreId: 28, page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(1)
    expect(result.value.page).toBe(1)
    expect(result.value.totalPages).toBe(1)
  })

  it('should return empty results when no movies for genre', async () => {
    provider.movies = []

    const result = await sut.execute({ genreId: 28, page: 1 })

    expect(result.isRight()).toBe(true)
    expect(result.value.results).toHaveLength(0)
  })
})
