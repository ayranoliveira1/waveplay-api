import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Favorite } from '../../domain/entities/favorite'
import type { Favorite as PrismaFavorite } from '@/shared/database/generated/prisma'

export class PrismaFavoriteMapper {
  static toDomain(raw: PrismaFavorite): Favorite {
    return Favorite.create(
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

  static toPrisma(favorite: Favorite) {
    return {
      id: favorite.id.toValue(),
      profileId: favorite.profileId,
      tmdbId: favorite.tmdbId,
      type: favorite.type,
      title: favorite.title,
      posterPath: favorite.posterPath,
      backdropPath: favorite.backdropPath,
      rating: favorite.rating,
      createdAt: favorite.createdAt,
    }
  }
}
