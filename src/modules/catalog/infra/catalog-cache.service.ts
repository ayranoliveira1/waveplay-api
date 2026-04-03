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
}
