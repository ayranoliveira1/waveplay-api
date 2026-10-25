import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CatalogCacheService } from './catalog-cache.service'
import {
  FakeCatalogProvider,
  makeFakeMultiResult,
} from 'test/providers/fake-catalog-provider'
import { FakeEmbedSourcesProvider } from 'test/providers/fake-embed-sources-provider'

let provider: FakeCatalogProvider
let embedSourcesProvider: FakeEmbedSourcesProvider
let redis: Record<string, any>
let sut: CatalogCacheService

function createFakeRedis() {
  const store = new Map<string, string>()

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(
      async (key: string, value: string, _ex: string, _ttl: number) => {
        store.set(key, value)
        return 'OK'
      },
    ),
    _store: store,
  }
}

describe('CatalogCacheService', () => {
  beforeEach(() => {
    provider = new FakeCatalogProvider()
    redis = createFakeRedis()
    embedSourcesProvider = new FakeEmbedSourcesProvider()
    sut = new CatalogCacheService(redis as any, provider, embedSourcesProvider)
  })

  it('should return cached data on cache hit (no provider call)', async () => {
    const cached = {
      page: 1,
      results: [makeFakeMultiResult()],
      total_pages: 1,
      total_results: 1,
    }

    redis._store.set('catalog:trending:1', JSON.stringify(cached))

    const result = await sut.getTrending(1)

    expect(result).toEqual(cached)
    expect(redis.get).toHaveBeenCalledWith('catalog:trending:1')
  })

  it('should fetch from provider on cache miss and store result', async () => {
    provider.multiResults = [makeFakeMultiResult({ id: 999 })]

    const result = await sut.getTrending(1)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].id).toBe(999)
    expect(redis.set).toHaveBeenCalledWith(
      'catalog:trending:1',
      expect.any(String),
      'EX',
      3600,
    )
  })

  it('should use correct TTL for detail (24h)', async () => {
    await sut.getMovieDetail(550)

    expect(redis.set).toHaveBeenCalledWith(
      'catalog:movie:550',
      expect.any(String),
      'EX',
      86400,
    )
  })

  it('should use correct TTL for search (30min)', async () => {
    await sut.search('test', 1)

    expect(redis.set).toHaveBeenCalledWith(
      'catalog:search:test:1',
      expect.any(String),
      'EX',
      1800,
    )
  })

  it('should use correct TTL for lists (1h)', async () => {
    await sut.getPopularMovies(1)

    expect(redis.set).toHaveBeenCalledWith(
      'catalog:movies:popular:1',
      expect.any(String),
      'EX',
      3600,
    )
  })

  it('should fallback to provider when Redis is down (get throws)', async () => {
    redis.get = vi.fn(async () => {
      throw new Error('Redis connection refused')
    })
    redis.set = vi.fn(async () => {
      throw new Error('Redis connection refused')
    })

    provider.multiResults = [makeFakeMultiResult({ id: 777 })]

    const result = await sut.getTrending(1)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].id).toBe(777)
  })

  it('should fallback to provider when Redis set fails', async () => {
    redis.set = vi.fn(async () => {
      throw new Error('Redis connection refused')
    })

    provider.multiResults = [makeFakeMultiResult({ id: 888 })]

    const result = await sut.getTrending(1)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].id).toBe(888)
  })

  it('should cache sources for 1h by title and episode', async () => {
    await sut.getMovieSources(550)
    await sut.getEpisodeSources(1396, 1, 2)

    expect(redis.set).toHaveBeenCalledWith(
      'catalog:sources:movie:550',
      expect.any(String),
      'EX',
      3600,
    )
    expect(redis.set).toHaveBeenCalledWith(
      'catalog:sources:tv:1396:1:2',
      expect.any(String),
      'EX',
      3600,
    )
  })

  it('does not cache partial sources', async () => {
    embedSourcesProvider.complete = false

    const movie = await sut.getMovieSources(550)
    const episode = await sut.getEpisodeSources(1396, 1, 1)

    expect(movie).toEqual(embedSourcesProvider.sources)
    expect(episode).toEqual(embedSourcesProvider.sources)
    expect(redis.set).not.toHaveBeenCalled()
  })

  it('does not cache empty sources', async () => {
    embedSourcesProvider.sources = []

    const movie = await sut.getMovieSources(550)
    const episode = await sut.getEpisodeSources(1396, 1, 1)

    expect(movie).toEqual([])
    expect(episode).toEqual([])
    expect(redis.set).not.toHaveBeenCalled()
  })
})
