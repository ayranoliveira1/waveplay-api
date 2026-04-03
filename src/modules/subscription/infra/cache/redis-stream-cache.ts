import { Inject, Injectable } from '@nestjs/common'
import type Redis from 'ioredis'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import type {
  StreamCacheData,
  ActiveStreamInfo,
} from '../../application/ports/stream-cache.port'
import { StreamCachePort } from '../../application/ports/stream-cache.port'

@Injectable()
export class RedisStreamCache implements StreamCachePort {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async addStream(data: StreamCacheData): Promise<void> {
    const pipeline = this.redis.pipeline()

    pipeline.zadd(
      `streams:${data.userId}`,
      Date.now(),
      data.streamId,
    )

    pipeline.hset(`stream:${data.streamId}`, {
      userId: data.userId,
      profileId: data.profileId,
      profileName: data.profileName,
      tmdbId: String(data.tmdbId),
      type: data.type,
      title: data.title,
      startedAt: data.startedAt.toISOString(),
    })

    await pipeline.exec()
  }

  async removeStream(userId: string, streamId: string): Promise<void> {
    const pipeline = this.redis.pipeline()

    pipeline.zrem(`streams:${userId}`, streamId)
    pipeline.del(`stream:${streamId}`)

    await pipeline.exec()
  }

  async updatePing(userId: string, streamId: string): Promise<void> {
    await this.redis.zadd(`streams:${userId}`, Date.now(), streamId)
  }

  async getActiveStreams(
    userId: string,
    thresholdMs: number,
  ): Promise<ActiveStreamInfo[]> {
    const threshold = Date.now() - thresholdMs

    const streamIds = await this.redis.zrangebyscore(
      `streams:${userId}`,
      threshold,
      '+inf',
    )

    if (streamIds.length === 0) {
      return []
    }

    const pipeline = this.redis.pipeline()
    for (const streamId of streamIds) {
      pipeline.hgetall(`stream:${streamId}`)
    }

    const results = await pipeline.exec()

    if (!results) {
      return []
    }

    const activeStreams: ActiveStreamInfo[] = []

    for (let i = 0; i < results.length; i++) {
      const [err, data] = results[i]
      if (err || !data || typeof data !== 'object') continue

      const hash = data as Record<string, string>
      if (!hash.streamId && streamIds[i]) {
        hash.streamId = streamIds[i]
      }

      if (hash.profileName && hash.title && hash.type && hash.startedAt) {
        activeStreams.push({
          streamId: streamIds[i],
          profileName: hash.profileName,
          title: hash.title,
          type: hash.type,
          startedAt: new Date(hash.startedAt),
        })
      }
    }

    return activeStreams
  }

  async countActiveStreams(
    userId: string,
    thresholdMs: number,
  ): Promise<number> {
    const threshold = Date.now() - thresholdMs
    await this.redis.zremrangebyscore(`streams:${userId}`, '-inf', threshold)
    return this.redis.zcard(`streams:${userId}`)
  }

  async getStreamOwner(streamId: string): Promise<string | null> {
    const userId = await this.redis.hget(`stream:${streamId}`, 'userId')
    return userId ?? null
  }

  async removeExpired(thresholdMs: number): Promise<number> {
    const threshold = Date.now() - thresholdMs
    let cursor = '0'
    let totalRemoved = 0

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        'streams:*',
        'COUNT',
        100,
      )
      cursor = nextCursor

      for (const key of keys) {
        const expiredStreamIds = await this.redis.zrangebyscore(
          key,
          '-inf',
          threshold,
        )

        if (expiredStreamIds.length === 0) continue

        const pipeline = this.redis.pipeline()
        pipeline.zremrangebyscore(key, '-inf', threshold)

        for (const streamId of expiredStreamIds) {
          pipeline.del(`stream:${streamId}`)
        }

        await pipeline.exec()
        totalRemoved += expiredStreamIds.length
      }
    } while (cursor !== '0')

    return totalRemoved
  }
}
