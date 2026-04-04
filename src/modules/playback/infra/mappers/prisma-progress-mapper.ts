import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Progress } from '../../domain/entities/progress'
import type { Progress as PrismaProgress } from '@/shared/database/generated/prisma'

export class PrismaProgressMapper {
  static toDomain(raw: PrismaProgress): Progress {
    return Progress.create(
      {
        profileId: raw.profileId,
        tmdbId: raw.tmdbId,
        type: raw.type,
        season: raw.season,
        episode: raw.episode,
        progressSeconds: raw.progressSeconds,
        durationSeconds: raw.durationSeconds,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(progress: Progress) {
    return {
      id: progress.id.toValue(),
      profileId: progress.profileId,
      tmdbId: progress.tmdbId,
      type: progress.type,
      season: progress.season,
      episode: progress.episode,
      progressSeconds: progress.progressSeconds,
      durationSeconds: progress.durationSeconds,
    }
  }
}
