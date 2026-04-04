import type { Favorite } from '../../domain/entities/favorite'
import type { WatchlistItem } from '../../domain/entities/watchlist-item'

export class MediaListPresenter {
  static toHTTP(entity: Favorite | WatchlistItem) {
    return {
      id: entity.id.toValue(),
      tmdbId: entity.tmdbId,
      type: entity.type,
      title: entity.title,
      posterPath: entity.posterPath,
      backdropPath: entity.backdropPath,
      rating: entity.rating,
      createdAt: entity.createdAt.toISOString(),
    }
  }
}
