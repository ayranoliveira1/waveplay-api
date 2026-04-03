import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { ActiveStreamsRepository } from '../../domain/repositories/active-streams-repository'

const STREAM_TIMEOUT_MS = 2 * 60 * 1000

type CleanupExpiredStreamsUseCaseResponse = Either<
  never,
  { deletedCount: number }
>

@Injectable()
export class CleanupExpiredStreamsUseCase {
  constructor(private activeStreamsRepository: ActiveStreamsRepository) {}

  async execute(): Promise<CleanupExpiredStreamsUseCaseResponse> {
    const threshold = new Date(Date.now() - STREAM_TIMEOUT_MS)

    const deletedCount =
      await this.activeStreamsRepository.deleteExpired(threshold)

    return right({ deletedCount })
  }
}
