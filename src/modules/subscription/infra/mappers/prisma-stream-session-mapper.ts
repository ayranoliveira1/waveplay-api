import type { StreamSession } from '../../domain/entities/stream-session'

export class PrismaStreamSessionMapper {
  static toPrisma(session: StreamSession) {
    return {
      id: session.id.toValue(),
      userId: session.userId,
      profileId: session.profileId,
      tmdbId: session.tmdbId,
      type: session.type,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
    }
  }
}
