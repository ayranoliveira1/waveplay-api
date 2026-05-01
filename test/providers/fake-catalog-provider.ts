import {
  CatalogProviderPort,
  type TMDBMovie,
  type TMDBSeries,
  type TMDBEpisode,
  type TMDBGenre,
  type TMDBPaginatedResponse,
  type TMDBMultiResult,
} from '@/modules/catalog/domain/ports/catalog-provider.port'

export function makeFakeMovie(overrides: Partial<TMDBMovie> = {}): TMDBMovie {
  return {
    id: 550,
    title: 'Clube da Luta',
    overview: 'Um homem deprimido que sofre de insônia...',
    poster_path: '/pB8BM7pdSp6B6Ih7QI4S2t0POsFj.jpg',
    backdrop_path: '/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg',
    vote_average: 8.4,
    vote_count: 26000,
    release_date: '1999-10-15',
    runtime: 139,
    genres: [{ id: 18, name: 'Drama' }],
    tagline: 'Mischief. Mayhem. Soap.',
    status: 'Released',
    original_language: 'en',
    ...overrides,
  }
}

export function makeFakeSeries(
  overrides: Partial<TMDBSeries> = {},
): TMDBSeries {
  return {
    id: 1396,
    name: 'Breaking Bad',
    overview: 'Um professor de química...',
    poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    vote_average: 8.9,
    vote_count: 12000,
    first_air_date: '2008-01-20',
    genres: [{ id: 18, name: 'Drama' }],
    tagline: '',
    status: 'Ended',
    number_of_seasons: 5,
    number_of_episodes: 62,
    original_language: 'en',
    seasons: [
      {
        id: 3572,
        season_number: 1,
        name: 'Temporada 1',
        overview: 'A primeira temporada...',
        episode_count: 7,
        poster_path: '/1BP4xYv9ZG4ZVHkL7ocOziBbSYH.jpg',
        air_date: '2008-01-20',
      },
    ],
    ...overrides,
  }
}

export function makeFakeEpisode(
  overrides: Partial<TMDBEpisode> = {},
): TMDBEpisode {
  return {
    id: 62085,
    name: 'Pilot',
    overview: 'Walter White, um professor...',
    episode_number: 1,
    season_number: 1,
    still_path: '/ydlY3iEN5qhyftNIGJKLB5b0bgA.jpg',
    air_date: '2008-01-20',
    runtime: 58,
    vote_average: 8.1,
    ...overrides,
  }
}

export function makeFakeMultiResult(
  overrides: Partial<TMDBMultiResult> = {},
): TMDBMultiResult {
  return {
    id: 550,
    title: 'Clube da Luta',
    overview: 'Um homem deprimido...',
    poster_path: '/pB8BM7pdSp6B6Ih7QI4S2t0POsFj.jpg',
    backdrop_path: '/hZkgoQYus5dXo3H8T7Uef6DNknx.jpg',
    vote_average: 8.4,
    release_date: '1999-10-15',
    media_type: 'movie',
    ...overrides,
  }
}

function paginate<T>(items: T[], page: number): TMDBPaginatedResponse<T> {
  return {
    page,
    results: items,
    total_pages: 1,
    total_results: items.length,
  }
}

export class FakeCatalogProvider extends CatalogProviderPort {
  public movies: TMDBMovie[] = [makeFakeMovie()]
  public seriesList: TMDBSeries[] = [makeFakeSeries()]
  public episodes: TMDBEpisode[] = [makeFakeEpisode()]
  public multiResults: TMDBMultiResult[] = [makeFakeMultiResult()]
  public genres: TMDBGenre[] = [
    { id: 28, name: 'Ação' },
    { id: 18, name: 'Drama' },
  ]

  async getTrending(page: number) {
    return paginate(this.multiResults, page)
  }

  async getMovieDetail(id: number) {
    return this.movies.find((m) => m.id === id) ?? null
  }

  async getSeriesDetail(id: number) {
    return this.seriesList.find((s) => s.id === id) ?? null
  }

  async getSeasonEpisodes(_seriesId: number, _seasonNumber: number) {
    return this.episodes.length > 0 ? this.episodes : null
  }

  async search(_query: string, page: number) {
    return paginate(this.multiResults, page)
  }

  async getPopularMovies(page: number) {
    return paginate(this.movies, page)
  }
  async getTopRatedMovies(page: number) {
    return paginate(this.movies, page)
  }
  async getNowPlayingMovies(page: number) {
    return paginate(this.movies, page)
  }
  async getUpcomingMovies(page: number) {
    return paginate(this.movies, page)
  }

  async getPopularSeries(page: number) {
    return paginate(this.seriesList, page)
  }
  async getTopRatedSeries(page: number) {
    return paginate(this.seriesList, page)
  }
  async getAiringTodaySeries(page: number) {
    return paginate(this.seriesList, page)
  }
  async getOnTheAirSeries(page: number) {
    return paginate(this.seriesList, page)
  }

  async getSimilarMovies(_id: number, page: number) {
    return paginate(this.movies, page)
  }
  async getSimilarSeries(_id: number, page: number) {
    return paginate(this.seriesList, page)
  }

  async getMoviesByGenre(_genreId: number, page: number) {
    return paginate(this.movies, page)
  }
  async getSeriesByGenre(_genreId: number, page: number) {
    return paginate(this.seriesList, page)
  }

  async discoverMoviesByWatchProviders(
    _providers: number[],
    _region: string,
    page: number,
  ) {
    return paginate(this.movies, page)
  }
  async discoverSeriesByWatchProviders(
    _providers: number[],
    _region: string,
    page: number,
  ) {
    return paginate(this.seriesList, page)
  }

  async getMovieGenres() {
    return this.genres
  }
  async getSeriesGenres() {
    return this.genres
  }
}
