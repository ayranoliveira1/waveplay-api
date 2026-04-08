import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { ActiveStreamsRepository } from '../../domain/repositories/active-streams-repository'
import { StreamSessionsRepository } from '../../domain/repositories/stream-sessions-repository'
import { StreamCachePort } from '../ports/stream-cache.port'
import { StreamSession } from '../../domain/entities/stream-session'
import { STREAM_TIMEOUT_MS } from '../../domain/constants/stream-timeout'

type CleanupExpiredStreamsUseCaseResponse = Either<
  never,
  { deletedCount: number }
>

@Injectable()
export class CleanupExpiredStreamsUseCase {
  constructor(
    private activeStreamsRepository: ActiveStreamsRepository,
    private streamSessionsRepository: StreamSessionsRepository,
    private streamCache: StreamCachePort,
  ) {}

  async execute(): Promise<CleanupExpiredStreamsUseCaseResponse> {
    const threshold = new Date(Date.now() - STREAM_TIMEOUT_MS)

    const expiredStreams =
      await this.activeStreamsRepository.findExpired(threshold)

    if (expiredStreams.length > 0) {
      const sessions = expiredStreams.map(StreamSession.createFromStream)
      await this.streamSessionsRepository.createMany(sessions)
    }

    const deletedCount =
      await this.activeStreamsRepository.deleteExpired(threshold)

    await this.streamCache.removeExpired(STREAM_TIMEOUT_MS)

    return right({ deletedCount })
  }
}
