export interface TMDBMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  release_date: string
  runtime: number | null
  genres: TMDBGenre[]
  tagline: string
  status: string
  original_language: string
  media_type?: string
  popularity?: number
}

export interface TMDBSeries {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  first_air_date: string
  genres: TMDBGenre[]
  tagline: string
  status: string
  number_of_seasons: number
  number_of_episodes: number
  original_language: string
  seasons: TMDBSeason[]
  media_type?: string
  popularity?: number
}

export interface TMDBSeason {
  id: number
  season_number: number
  name: string
  overview: string
  episode_count: number
  poster_path: string | null
  air_date: string
}

export interface TMDBEpisode {
  id: number
  name: string
  overview: string
  episode_number: number
  season_number: number
  still_path: string | null
  air_date: string
  runtime: number | null
  vote_average: number
}

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBPaginatedResponse<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export interface TMDBMultiResult {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  release_date?: string
  first_air_date?: string
  media_type: 'movie' | 'tv'
}

export abstract class CatalogProviderPort {
  abstract getTrending(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMultiResult>>

  abstract getMovieDetail(id: number): Promise<TMDBMovie | null>
  abstract getSeriesDetail(id: number): Promise<TMDBSeries | null>

  abstract getSeasonEpisodes(
    seriesId: number,
    seasonNumber: number,
  ): Promise<TMDBEpisode[] | null>

  abstract search(
    query: string,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMultiResult>>

  abstract getPopularMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>>
  abstract getTopRatedMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>>
  abstract getNowPlayingMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>>
  abstract getUpcomingMovies(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>>

  abstract getPopularSeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>>
  abstract getTopRatedSeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>>
  abstract getAiringTodaySeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>>
  abstract getOnTheAirSeries(
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>>

  abstract getSimilarMovies(
    id: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>>
  abstract getSimilarSeries(
    id: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>>

  abstract getMoviesByGenre(
    genreId: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>>
  abstract getSeriesByGenre(
    genreId: number,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>>

  abstract discoverMoviesByWatchProviders(
    providers: number[],
    region: string,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBMovie>>
  abstract discoverSeriesByWatchProviders(
    providers: number[],
    region: string,
    page: number,
  ): Promise<TMDBPaginatedResponse<TMDBSeries>>

  abstract getMovieGenres(): Promise<TMDBGenre[]>
  abstract getSeriesGenres(): Promise<TMDBGenre[]>
}
