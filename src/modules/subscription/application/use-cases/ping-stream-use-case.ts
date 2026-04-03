import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { StreamCachePort } from '../ports/stream-cache.port'
import { StreamNotFoundError } from '../../domain/errors/stream-not-found.error'

interface PingStreamUseCaseRequest {
  userId: string
  streamId: string
}

type PingStreamUseCaseResponse = Either<StreamNotFoundError, null>

@Injectable()
export class PingStreamUseCase {
  constructor(private streamCache: StreamCachePort) {}

  async execute(
    request: PingStreamUseCaseRequest,
  ): Promise<PingStreamUseCaseResponse> {
    const { userId, streamId } = request

    const owner = await this.streamCache.getStreamOwner(streamId)

    if (!owner || owner !== userId) {
      return left(new StreamNotFoundError())
    }

    await this.streamCache.updatePing(userId, streamId)

    return right(null)
  }
}
