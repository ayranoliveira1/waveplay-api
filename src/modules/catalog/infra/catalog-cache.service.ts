import { Inject, Injectable } from '@nestjs/common'
import type Redis from 'ioredis'

import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import {
  CatalogProviderPort,
  type TMDBMovie,
  type TMDBSeries,
  type TMDBEpisode,
  type TMDBGenre,
  type TMDBPaginatedResponse,
  type TMDBMultiResult,
} from '../domain/ports/catalog-provider.port'
import { MoviePresenter } from './presenters/movie-presenter'
import { SeriesPresenter } from './presenters/series-presenter'

export type CatalogListItem =
  | ReturnType<typeof MoviePresenter.toList>
  | ReturnType<typeof SeriesPresenter.toList>

export interface ByWatchProvidersResult {
  results: CatalogListItem[]
  page: number
  totalPages: number
}

const WATCH_REGION = 'BR'

const TTL = {
  TRENDING: 3600,
  DETAIL: 86400,
  SEARCH: 1800,
  LIST: 3600,
} as const

@Injectable()
export class CatalogCacheService {
  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    private catalogProvider: CatalogProviderPort,
  ) {}

  private async getOrFetch<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.redis.get(key)
      if (cached) return JSON.parse(cached) as T
    } catch {
      // Redis down — fallback to TMDB
    }

    const data = await fetcher()

    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttl)
    } catch {
      // Redis down — skip cache write
    }

    return data
  }

  async getTrending(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMultiResult>> {
    return this.getOrFetch(`catalog:trending:${page}`, TTL.TRENDING, () =>
      this.catalogProvider.getTrending(page),
    )
  }

  async getMovieDetail(id: number): Promise<TMDBMovie | null> {
    return this.getOrFetch(`catalog:movie:${id}`, TTL.DETAIL, () =>
      this.catalogProvider.getMovieDetail(id),
    )
  }

  async getSeriesDetail(id: number): Promise<TMDBSeries | null> {
    return this.getOrFetch(`catalog:series:${id}`, TTL.DETAIL, () =>
      this.catalogProvider.getSeriesDetail(id),
    )
  }

  async getSeasonEpisodes(
    seriesId: number,
    seasonNumber: number,
  ): Promise<TMDBEpisode[] | null> {
    return this.getOrFetch(
      `catalog:series:${seriesId}:season:${seasonNumber}`,
      TTL.DETAIL,
      () => this.catalogProvider.getSeasonEpisodes(seriesId, seasonNumber),
    )
  }

  async search(
    query: string,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMultiResult>> {
    return this.getOrFetch(`catalog:search:${query}:${page}`, TTL.SEARCH, () =>
      this.catalogProvider.search(query, page),
    )
  }

  async getPopularMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return this.getOrFetch(`catalog:movies:popular:${page}`, TTL.LIST, () =>
      this.catalogProvider.getPopularMovies(page),
    )
  }

  async getTopRatedMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return this.getOrFetch(`catalog:movies:top-rated:${page}`, TTL.LIST, () =>
      this.catalogProvider.getTopRatedMovies(page),
    )
  }

  async getNowPlayingMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return this.getOrFetch(`catalog:movies:now-playing:${page}`, TTL.LIST, () =>
      this.catalogProvider.getNowPlayingMovies(page),
    )
  }

  async getUpcomingMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return this.getOrFetch(`catalog:movies:upcoming:${page}`, TTL.LIST, () =>
      this.catalogProvider.getUpcomingMovies(page),
    )
  }

  async getPopularSeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    return this.getOrFetch(`catalog:series:popular:${page}`, TTL.LIST, () =>
      this.catalogProvider.getPopularSeries(page),
    )
  }

  async getTopRatedSeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    return this.getOrFetch(`catalog:series:top-rated:${page}`, TTL.LIST, () =>
      this.catalogProvider.getTopRatedSeries(page),
    )
  }

  async getAiringTodaySeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    return this.getOrFetch(
      `catalog:series:airing-today:${page}`,
      TTL.LIST,
      () => this.catalogProvider.getAiringTodaySeries(page),
    )
  }

  async getOnTheAirSeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    return this.getOrFetch(`catalog:series:on-the-air:${page}`, TTL.LIST, () =>
      this.catalogProvider.getOnTheAirSeries(page),
    )
  }

  async getSimilarMovies(
    id: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return this.getOrFetch(
      `catalog:movies:${id}:similar:${page}`,
      TTL.LIST,
      () => this.catalogProvider.getSimilarMovies(id, page),
    )
  }

  async getSimilarSeries(
    id: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    return this.getOrFetch(
      `catalog:series:${id}:similar:${page}`,
      TTL.LIST,
      () => this.catalogProvider.getSimilarSeries(id, page),
    )
  }

  async getMoviesByGenre(
    genreId: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    return this.getOrFetch(
      `catalog:movies:genre:${genreId}:${page}`,
      TTL.LIST,
      () => this.catalogProvider.getMoviesByGenre(genreId, page),
    )
  }

  async getSeriesByGenre(
    genreId: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    return this.getOrFetch(
      `catalog:series:genre:${genreId}:${page}`,
      TTL.LIST,
      () => this.catalogProvider.getSeriesByGenre(genreId, page),
    )
  }

  async getMovieGenres(): Promise<TMDBGenre[]> {
    return this.getOrFetch('catalog:genres:movies', TTL.LIST, () =>
      this.catalogProvider.getMovieGenres(),
    )
  }

  async getSeriesGenres(): Promise<TMDBGenre[]> {
    return this.getOrFetch('catalog:genres:series', TTL.LIST, () =>
      this.catalogProvider.getSeriesGenres(),
    )
  }

  async getByWatchProviders(
    providers: number[],
    page: number,
  ): Promise<ByWatchProvidersResult> {
    const sortedProviders = [...providers].sort((a, b) => a - b)
    const cacheKey = `catalog:by-watch-providers:${sortedProviders.join(',')}:${WATCH_REGION}:${page}`

    return this.getOrFetch(cacheKey, TTL.LIST, async () => {
      const [moviesRes, seriesRes] = await Promise.allSettled([
        this.catalogProvider.discoverMoviesByWatchProviders(
          providers,
          WATCH_REGION,
          page,
        ),
        this.catalogProvider.discoverSeriesByWatchProviders(
          providers,
          WATCH_REGION,
          page,
        ),
      ])

      const movies =
        moviesRes.status === 'fulfilled'
          ? moviesRes.value
          : { results: [], total_pages: 0, page, total_results: 0 }
      const series =
        seriesRes.status === 'fulfilled'
          ? seriesRes.value
          : { results: [], total_pages: 0, page, total_results: 0 }

      const merged: Array<{ item: CatalogListItem; popularity: number }> = [
        ...movies.results.map((m) => ({
          item: MoviePresenter.toList(m) as CatalogListItem,
          popularity: m.popularity ?? 0,
        })),
        ...series.results.map((s) => ({
          item: SeriesPresenter.toList(s) as CatalogListItem,
          popularity: s.popularity ?? 0,
        })),
      ]

      const results = merged
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 20)
        .map((x) => x.item)

      return {
        results,
        page,
        totalPages: Math.max(movies.total_pages ?? 0, series.total_pages ?? 0),
      }
    })
  }
}
