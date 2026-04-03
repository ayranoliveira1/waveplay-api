import { describe, it, expect, beforeEach } from 'vitest'

import { GetMovieDetailUseCase } from './get-movie-detail-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
let cacheService: CatalogCacheService
let sut: GetMovieDetailUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetMovieDetailUseCase', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    cacheService = new CatalogCacheService(fakeRedis, provider)
    sut = new GetMovieDetailUseCase(cacheService)
  })

  it('should return movie detail', async () => {
    const result = await sut.execute({ id: 550 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.movie.id).toBe(550)
      expect(result.value.movie.title).toBe('Clube da Luta')
    }
  })

  it('should return left when movie not found', async () => {
    provider.movies = []

    const result = await sut.execute({ id: 999999 })

    expect(result.isLeft()).toBe(true)
  })
})
