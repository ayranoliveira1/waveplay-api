import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { WatchlistItem } from '../../domain/entities/watchlist-item'
import type { WatchlistItem as PrismaWatchlistItem } from '@/shared/database/generated/prisma'

export class PrismaWatchlistMapper {
  static toDomain(raw: PrismaWatchlistItem): WatchlistItem {
    return WatchlistItem.create(
      {
        profileId: raw.profileId,
        tmdbId: raw.tmdbId,
        type: raw.type,
        title: raw.title,
        posterPath: raw.posterPath,
        backdropPath: raw.backdropPath,
        rating: raw.rating,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(item: WatchlistItem) {
    return {
      id: item.id.toValue(),
      profileId: item.profileId,
      tmdbId: item.tmdbId,
      type: item.type,
      title: item.title,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      rating: item.rating,
      createdAt: item.createdAt,
    }
  }
}
