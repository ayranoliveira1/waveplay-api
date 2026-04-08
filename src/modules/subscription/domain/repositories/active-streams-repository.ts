import type { ActiveStream } from '../entities/active-stream'

export abstract class ActiveStreamsRepository {
  abstract findById(id: string): Promise<ActiveStream | null>
  abstract findByUserAndProfile(
    userId: string,
    profileId: string,
  ): Promise<ActiveStream | null>
  abstract createOrUpdate(
    stream: ActiveStream,
    maxStreams: number,
  ): Promise<void>
  abstract updatePing(id: string, lastPing: Date): Promise<void>
  abstract delete(id: string): Promise<void>
  abstract findExpired(threshold: Date): Promise<ActiveStream[]>
  abstract deleteExpired(threshold: Date): Promise<number>
}
