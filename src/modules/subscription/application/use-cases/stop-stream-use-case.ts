import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { ActiveStreamsRepository } from '../../domain/repositories/active-streams-repository'
import { StreamCachePort } from '../ports/stream-cache.port'
import { StreamNotFoundError } from '../../domain/errors/stream-not-found.error'

interface StopStreamUseCaseRequest {
  userId: string
  streamId: string
}

type StopStreamUseCaseResponse = Either<StreamNotFoundError, null>

@Injectable()
export class StopStreamUseCase {
  constructor(
    private activeStreamsRepository: ActiveStreamsRepository,
    private streamCache: StreamCachePort,
  ) {}

  async execute(
    request: StopStreamUseCaseRequest,
  ): Promise<StopStreamUseCaseResponse> {
    const { userId, streamId } = request

    const stream = await this.activeStreamsRepository.findById(streamId)

    if (!stream || stream.userId !== userId) {
      return left(new StreamNotFoundError())
    }

    await this.activeStreamsRepository.delete(streamId)
    await this.streamCache.removeStream(userId, streamId)

    return right(null)
  }
}
