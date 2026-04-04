import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { HistoryItem } from '../../domain/entities/history-item'
import type { HistoryItem as PrismaHistoryItem } from '@/shared/database/generated/prisma'

export class PrismaHistoryMapper {
  static toDomain(raw: PrismaHistoryItem): HistoryItem {
    return HistoryItem.create(
      {
        profileId: raw.profileId,
        tmdbId: raw.tmdbId,
        type: raw.type,
        title: raw.title,
        posterPath: raw.posterPath,
        season: raw.season,
        episode: raw.episode,
        progressSeconds: raw.progressSeconds,
        durationSeconds: raw.durationSeconds,
        watchedAt: raw.watchedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(item: HistoryItem) {
    return {
      id: item.id.toValue(),
      profileId: item.profileId,
      tmdbId: item.tmdbId,
      type: item.type,
      title: item.title,
      posterPath: item.posterPath,
      season: item.season,
      episode: item.episode,
      progressSeconds: item.progressSeconds,
      durationSeconds: item.durationSeconds,
      watchedAt: item.watchedAt,
    }
  }
}
