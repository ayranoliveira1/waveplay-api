import type { TMDBMultiResult } from '../../domain/ports/catalog-provider.port'

export class SearchPresenter {
  static toHTTP(item: TMDBMultiResult) {
    return {
      id: item.id,
      title: item.title ?? item.name ?? '',
      overview: item.overview,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      rating: item.vote_average,
      type: item.media_type === 'tv' ? ('series' as const) : ('movie' as const),
      releaseDate: item.release_date ?? item.first_air_date ?? '',
    }
  }
}
