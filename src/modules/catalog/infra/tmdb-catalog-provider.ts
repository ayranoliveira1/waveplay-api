import { Injectable } from '@nestjs/common'
import axios from 'axios'
import type { AxiosInstance } from 'axios'

import { EnvService } from '@/shared/env/env.service'
import {
  CatalogProviderPort,
  type TMDBMovie,
  type TMDBSeries,
  type TMDBEpisode,
  type TMDBGenre,
  type TMDBPaginatedResponse,
  type TMDBMultiResult,
} from '../domain/ports/catalog-provider.port'

@Injectable()
export class TmdbCatalogProvider extends CatalogProviderPort {
  private readonly api: AxiosInstance

  constructor(private env: EnvService) {
    super()
    this.api = axios.create({
      baseURL: this.env.get('TMDB_BASE_URL'),
      timeout: 10_000,
      maxRedirects: 0,
      headers: {
        Authorization: `Bearer ${this.env.get('TMDB_ACCESS_TOKEN')}`,
        Accept: 'application/json',
      },
      params: {
        language: 'pt-BR',
      },
    })
  }

  async getTrending(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMultiResult>> {
    const { data } = await this.api.get('/trending/all/week', {
      params: { page },
    })
    return data
  }

  async getMovieDetail(id: number): Promise<TMDBMovie | null> {
    try {
      const { data } = await this.api.get(`/movie/${id}`)
      return data
    } catch (error: any) {
      if (error?.response?.status === 404) return null
      throw error
    }
  }

  async getSeriesDetail(id: number): Promise<TMDBSeries | null> {
    try {
      const { data } = await this.api.get(`/tv/${id}`)
      return data
    } catch (error: any) {
      if (error?.response?.status === 404) return null
      throw error
    }
  }

  async getSeasonEpisodes(
    seriesId: number,
    seasonNumber: number,
  ): Promise<TMDBEpisode[] | null> {
    try {
      const { data } = await this.api.get(
        `/tv/${seriesId}/season/${seasonNumber}`,
      )
      return data.episodes ?? []
    } catch (error: any) {
      if (error?.response?.status === 404) return null
      throw error
    }
  }

  async search(
    query: string,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMultiResult>> {
    const { data } = await this.api.get('/search/multi', {
      params: { query, page },
    })
    return data
  }

  async getPopularMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    const { data } = await this.api.get('/movie/popular', {
      params: { page },
    })
    return data
  }

  async getTopRatedMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    const { data } = await this.api.get('/movie/top_rated', {
      params: { page },
    })
    return data
  }

  async getNowPlayingMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    const { data } = await this.api.get('/movie/now_playing', {
      params: { page },
    })
    return data
  }

  async getUpcomingMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    const { data } = await this.api.get('/movie/upcoming', {
      params: { page },
    })
    return data
  }

  async getPopularSeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    const { data } = await this.api.get('/tv/popular', {
      params: { page },
    })
    return data
  }

  async getTopRatedSeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    const { data } = await this.api.get('/tv/top_rated', {
      params: { page },
    })
    return data
  }

  async getAiringTodaySeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    const { data } = await this.api.get('/tv/airing_today', {
      params: { page },
    })
    return data
  }

  async getOnTheAirSeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    const { data } = await this.api.get('/tv/on_the_air', {
      params: { page },
    })
    return data
  }

  async getSimilarMovies(
    id: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    const { data } = await this.api.get(`/movie/${id}/similar`, {
      params: { page },
    })
    return data
  }

  async getSimilarSeries(
    id: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    const { data } = await this.api.get(`/tv/${id}/similar`, {
      params: { page },
    })
    return data
  }

  async getMoviesByGenre(
    genreId: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    const { data } = await this.api.get('/discover/movie', {
      params: { with_genres: genreId, sort_by: 'popularity.desc', page },
    })
    return data
  }

  async getSeriesByGenre(
    genreId: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    const { data } = await this.api.get('/discover/tv', {
      params: { with_genres: genreId, sort_by: 'popularity.desc', page },
    })
    return data
  }

  async discoverMoviesByWatchProviders(
    providers: number[],
    region: string,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>> {
    const { data } = await this.api.get('/discover/movie', {
      params: {
        with_watch_providers: providers.join('|'),
        watch_region: region,
        with_watch_monetization_types: 'flatrate',
        sort_by: 'popularity.desc',
        page,
      },
    })
    return data
  }

  async discoverSeriesByWatchProviders(
    providers: number[],
    region: string,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>> {
    const { data } = await this.api.get('/discover/tv', {
      params: {
        with_watch_providers: providers.join('|'),
        watch_region: region,
        with_watch_monetization_types: 'flatrate',
        sort_by: 'popularity.desc',
        page,
      },
    })
    return data
  }

  async getMovieGenres(): Promise<TMDBGenre[]> {
    const { data } = await this.api.get('/genre/movie/list')
    return data.genres ?? []
  }

  async getSeriesGenres(): Promise<TMDBGenre[]> {
    const { data } = await this.api.get('/genre/tv/list')
    return data.genres ?? []
  }
}
