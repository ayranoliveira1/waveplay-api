import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { ActiveStream } from '../../domain/entities/active-stream'
import type { ActiveStream as PrismaActiveStream } from '@/shared/database/generated/prisma'

export class PrismaActiveStreamMapper {
  static toDomain(raw: PrismaActiveStream): ActiveStream {
    return ActiveStream.create(
      {
        userId: raw.userId,
        profileId: raw.profileId,
        tmdbId: raw.tmdbId,
        type: raw.type,
        startedAt: raw.startedAt,
        lastPing: raw.lastPing,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(stream: ActiveStream) {
    return {
      id: stream.id.toValue(),
      userId: stream.userId,
      profileId: stream.profileId,
      tmdbId: stream.tmdbId,
      type: stream.type,
      startedAt: stream.startedAt,
      lastPing: stream.lastPing,
    }
  }
}
