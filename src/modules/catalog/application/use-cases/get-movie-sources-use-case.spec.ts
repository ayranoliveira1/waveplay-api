import { describe, it, expect, beforeEach } from 'vitest'

import { GetMovieSourcesUseCase } from './get-movie-sources-use-case'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'
import { FakeEmbedSourcesProvider } from 'test/providers/fake-embed-sources-provider'

let embedSourcesProvider: FakeEmbedSourcesProvider
let cacheService: CatalogCacheService
let sut: GetMovieSourcesUseCase

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
} as any

describe('GetMovieSourcesUseCase', () => {
  beforeEach(() => {
    embedSourcesProvider = new FakeEmbedSourcesProvider()
    cacheService = new CatalogCacheService(
      fakeRedis,
      new FakeCatalogProvider(),
      embedSourcesProvider,
    )
    sut = new GetMovieSourcesUseCase(cacheService)
  })

  it('should return movie sources', async () => {
    const result = await sut.execute({ id: 550 })

    expect(result.isRight()).toBe(true)
    expect(result.value).toEqual({ sources: embedSourcesProvider.sources })
  })

  it('should return right with empty list when there are no sources', async () => {
    embedSourcesProvider.sources = []

    const result = await sut.execute({ id: 550 })

    expect(result.isRight()).toBe(true)
    expect(result.value).toEqual({ sources: [] })
  })
})
