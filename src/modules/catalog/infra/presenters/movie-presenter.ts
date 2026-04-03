import type { TMDBMovie } from '../../domain/ports/catalog-provider.port'

export class MoviePresenter {
  static toList(movie: TMDBMovie) {
    return {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      rating: movie.vote_average,
      type: 'movie' as const,
      releaseDate: movie.release_date,
    }
  }

  static toDetail(movie: TMDBMovie) {
    return {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      rating: movie.vote_average,
      voteCount: movie.vote_count,
      runtime: movie.runtime,
      releaseDate: movie.release_date,
      genres: movie.genres,
      tagline: movie.tagline,
      status: movie.status,
      originalLanguage: movie.original_language,
    }
  }
}
