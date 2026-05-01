import { Module } from '@nestjs/common'

// Use cases
import { GetTrendingUseCase } from '../application/use-cases/get-trending-use-case'
import { GetMovieDetailUseCase } from '../application/use-cases/get-movie-detail-use-case'
import { GetSeriesDetailUseCase } from '../application/use-cases/get-series-detail-use-case'
import { SearchCatalogUseCase } from '../application/use-cases/search-catalog-use-case'
import { GetSeasonEpisodesUseCase } from '../application/use-cases/get-season-episodes-use-case'
import { GetSimilarMoviesUseCase } from '../application/use-cases/get-similar-movies-use-case'
import { GetSimilarSeriesUseCase } from '../application/use-cases/get-similar-series-use-case'
import { GetMoviesByGenreUseCase } from '../application/use-cases/get-movies-by-genre-use-case'
import { GetSeriesByGenreUseCase } from '../application/use-cases/get-series-by-genre-use-case'
import { GetMovieGenresUseCase } from '../application/use-cases/get-movie-genres-use-case'
import { GetSeriesGenresUseCase } from '../application/use-cases/get-series-genres-use-case'
import { GetPopularMoviesUseCase } from '../application/use-cases/get-popular-movies-use-case'
import { GetTopRatedMoviesUseCase } from '../application/use-cases/get-top-rated-movies-use-case'
import { GetNowPlayingMoviesUseCase } from '../application/use-cases/get-now-playing-movies-use-case'
import { GetUpcomingMoviesUseCase } from '../application/use-cases/get-upcoming-movies-use-case'
import { GetPopularSeriesUseCase } from '../application/use-cases/get-popular-series-use-case'
import { GetTopRatedSeriesUseCase } from '../application/use-cases/get-top-rated-series-use-case'
import { GetAiringTodaySeriesUseCase } from '../application/use-cases/get-airing-today-series-use-case'
import { GetOnTheAirSeriesUseCase } from '../application/use-cases/get-on-the-air-series-use-case'
import { GetByWatchProvidersUseCase } from '../application/use-cases/get-by-watch-providers-use-case'

// Controllers (order matters: static routes before :id params)
import { TrendingController } from './controllers/trending.controller'
import { SearchController } from './controllers/search.controller'
import { ByWatchProvidersController } from './controllers/by-watch-providers.controller'
import { MovieGenresController } from './controllers/movie-genres.controller'
import { SeriesGenresController } from './controllers/series-genres.controller'
import { PopularMoviesController } from './controllers/popular-movies.controller'
import { TopRatedMoviesController } from './controllers/top-rated-movies.controller'
import { NowPlayingMoviesController } from './controllers/now-playing-movies.controller'
import { UpcomingMoviesController } from './controllers/upcoming-movies.controller'
import { MoviesByGenreController } from './controllers/movies-by-genre.controller'
import { PopularSeriesController } from './controllers/popular-series.controller'
import { TopRatedSeriesController } from './controllers/top-rated-series.controller'
import { AiringTodaySeriesController } from './controllers/airing-today-series.controller'
import { OnTheAirSeriesController } from './controllers/on-the-air-series.controller'
import { SeriesByGenreController } from './controllers/series-by-genre.controller'
import { MovieDetailController } from './controllers/movie-detail.controller'
import { SimilarMoviesController } from './controllers/similar-movies.controller'
import { SeriesDetailController } from './controllers/series-detail.controller'
import { SeasonEpisodesController } from './controllers/season-episodes.controller'
import { SimilarSeriesController } from './controllers/similar-series.controller'

// Infra
import { CatalogCacheService } from './catalog-cache.service'
import { CatalogProviderPort } from '../domain/ports/catalog-provider.port'
import { TmdbCatalogProvider } from './tmdb-catalog-provider'

@Module({
  controllers: [
    // Static routes first
    TrendingController,
    SearchController,
    ByWatchProvidersController,
    MovieGenresController,
    SeriesGenresController,

    // Movie static routes before :id
    PopularMoviesController,
    TopRatedMoviesController,
    NowPlayingMoviesController,
    UpcomingMoviesController,
    MoviesByGenreController,
    MovieDetailController,
    SimilarMoviesController,

    // Series static routes before :id
    PopularSeriesController,
    TopRatedSeriesController,
    AiringTodaySeriesController,
    OnTheAirSeriesController,
    SeriesByGenreController,
    SeriesDetailController,
    SeasonEpisodesController,
    SimilarSeriesController,
  ],
  providers: [
    // Use cases
    GetTrendingUseCase,
    GetMovieDetailUseCase,
    GetSeriesDetailUseCase,
    SearchCatalogUseCase,
    GetSeasonEpisodesUseCase,
    GetSimilarMoviesUseCase,
    GetSimilarSeriesUseCase,
    GetMoviesByGenreUseCase,
    GetSeriesByGenreUseCase,
    GetMovieGenresUseCase,
    GetSeriesGenresUseCase,
    GetPopularMoviesUseCase,
    GetTopRatedMoviesUseCase,
    GetNowPlayingMoviesUseCase,
    GetUpcomingMoviesUseCase,
    GetPopularSeriesUseCase,
    GetTopRatedSeriesUseCase,
    GetAiringTodaySeriesUseCase,
    GetOnTheAirSeriesUseCase,
    GetByWatchProvidersUseCase,

    // Infra
    CatalogCacheService,
    { provide: CatalogProviderPort, useClass: TmdbCatalogProvider },
  ],
})
export class CatalogModule {}
