export interface StreamCacheData {
  userId: string
  profileId: string
  profileName: string
  streamId: string
  tmdbId: number
  type: string
  title: string
  startedAt: Date
}

export interface ActiveStreamInfo {
  streamId: string
  profileName: string
  title: string
  type: string
  startedAt: Date
}

export abstract class StreamCachePort {
  abstract addStream(data: StreamCacheData): Promise<void>
  abstract removeStream(userId: string, streamId: string): Promise<void>
  abstract updatePing(userId: string, streamId: string): Promise<void>
  abstract getActiveStreams(
    userId: string,
    thresholdMs: number,
  ): Promise<ActiveStreamInfo[]>
  abstract getStreamOwner(streamId: string): Promise<string | null>
  abstract removeExpired(thresholdMs: number): Promise<number>
}
