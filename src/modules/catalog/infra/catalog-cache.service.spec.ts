import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CatalogCacheService } from './catalog-cache.service'
import {
  FakeCatalogProvider,
  makeFakeMultiResult,
} from 'test/providers/fake-catalog-provider'

let provider: FakeCatalogProvider
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
    sut = new CatalogCacheService(redis as any, provider)
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
})
