import type { TMDBGenre } from '../../domain/ports/catalog-provider.port'

export class GenrePresenter {
  static toHTTP(genre: TMDBGenre) {
    return {
      id: genre.id,
      name: genre.name,
    }
  }
}
