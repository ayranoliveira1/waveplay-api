import type { StreamSession } from '../entities/stream-session'

export abstract class StreamSessionsRepository {
  abstract create(session: StreamSession): Promise<void>
  abstract createMany(sessions: StreamSession[]): Promise<void>
}
