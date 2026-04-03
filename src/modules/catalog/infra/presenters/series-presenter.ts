import type {
  TMDBSeries,
  TMDBSeason,
  TMDBEpisode,
} from '../../domain/ports/catalog-provider.port'

export class SeriesPresenter {
  static toList(series: TMDBSeries) {
    return {
      id: series.id,
      title: series.name,
      overview: series.overview,
      posterPath: series.poster_path,
      backdropPath: series.backdrop_path,
      rating: series.vote_average,
      type: 'series' as const,
      releaseDate: series.first_air_date,
    }
  }

  static toDetail(series: TMDBSeries) {
    return {
      id: series.id,
      name: series.name,
      overview: series.overview,
      posterPath: series.poster_path,
      backdropPath: series.backdrop_path,
      rating: series.vote_average,
      voteCount: series.vote_count,
      firstAirDate: series.first_air_date,
      genres: series.genres,
      tagline: series.tagline,
      status: series.status,
      numberOfSeasons: series.number_of_seasons,
      numberOfEpisodes: series.number_of_episodes,
      originalLanguage: series.original_language,
      seasons: series.seasons?.map(SeriesPresenter.seasonToHTTP) ?? [],
    }
  }

  static seasonToHTTP(season: TMDBSeason) {
    return {
      id: season.id,
      seasonNumber: season.season_number,
      name: season.name,
      overview: season.overview,
      episodeCount: season.episode_count,
      posterPath: season.poster_path,
      airDate: season.air_date,
    }
  }

  static episodeToHTTP(episode: TMDBEpisode) {
    return {
      id: episode.id,
      name: episode.name,
      overview: episode.overview,
      episodeNumber: episode.episode_number,
      seasonNumber: episode.season_number,
      stillPath: episode.still_path,
      airDate: episode.air_date,
      runtime: episode.runtime,
      voteAverage: episode.vote_average,
    }
  }
}
