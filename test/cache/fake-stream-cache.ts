import type {
  StreamCacheData,
  ActiveStreamInfo,
} from '@/modules/subscription/application/ports/stream-cache.port'
import { StreamCachePort } from '@/modules/subscription/application/ports/stream-cache.port'

interface StoredStream extends StreamCacheData {
  lastPing: number
}

export class FakeStreamCache implements StreamCachePort {
  public streams = new Map<string, StoredStream>()

  async addStream(data: StreamCacheData): Promise<void> {
    this.streams.set(data.streamId, {
      ...data,
      lastPing: Date.now(),
    })
  }

  async removeStream(userId: string, streamId: string): Promise<void> {
    const stream = this.streams.get(streamId)
    if (stream && stream.userId === userId) {
      this.streams.delete(streamId)
    }
  }

  async updatePing(userId: string, streamId: string): Promise<void> {
    const stream = this.streams.get(streamId)
    if (stream && stream.userId === userId) {
      stream.lastPing = Date.now()
    }
  }

  async getActiveStreams(
    userId: string,
    thresholdMs: number,
  ): Promise<ActiveStreamInfo[]> {
    const threshold = Date.now() - thresholdMs
    const result: ActiveStreamInfo[] = []

    for (const stream of this.streams.values()) {
      if (stream.userId === userId && stream.lastPing >= threshold) {
        result.push({
          streamId: stream.streamId,
          profileName: stream.profileName,
          title: stream.title,
          type: stream.type,
          startedAt: stream.startedAt,
        })
      }
    }

    return result
  }

  async countActiveStreams(
    userId: string,
    thresholdMs: number,
  ): Promise<number> {
    const threshold = Date.now() - thresholdMs
    let count = 0

    for (const stream of this.streams.values()) {
      if (stream.userId === userId && stream.lastPing >= threshold) {
        count++
      }
    }

    return count
  }

  async getStreamOwner(streamId: string): Promise<string | null> {
    const stream = this.streams.get(streamId)
    return stream?.userId ?? null
  }

  async removeExpired(thresholdMs: number): Promise<number> {
    const threshold = Date.now() - thresholdMs
    let count = 0

    for (const [streamId, stream] of this.streams.entries()) {
      if (stream.lastPing < threshold) {
        this.streams.delete(streamId)
        count++
      }
    }

    return count
  }
}
