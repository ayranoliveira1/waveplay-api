import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { ActiveStreamsRepository } from '../../domain/repositories/active-streams-repository'
import { StreamNotFoundError } from '../../domain/errors/stream-not-found.error'

interface PingStreamUseCaseRequest {
  userId: string
  streamId: string
}

type PingStreamUseCaseResponse = Either<StreamNotFoundError, null>

@Injectable()
export class PingStreamUseCase {
  constructor(private activeStreamsRepository: ActiveStreamsRepository) {}

  async execute(
    request: PingStreamUseCaseRequest,
  ): Promise<PingStreamUseCaseResponse> {
    const { userId, streamId } = request

    const stream = await this.activeStreamsRepository.findById(streamId)

    if (!stream || stream.userId !== userId) {
      return left(new StreamNotFoundError())
    }

    await this.activeStreamsRepository.updatePing(streamId, new Date())

    return right(null)
  }
}
