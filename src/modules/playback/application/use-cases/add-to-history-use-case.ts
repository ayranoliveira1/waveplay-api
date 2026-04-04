import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { HistoryItem } from '../../domain/entities/history-item'
import { HistoryRepository } from '../../domain/repositories/history-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'

const HISTORY_LIMIT = 50

interface AddToHistoryUseCaseRequest {
  userId: string
  profileId: string
  tmdbId: number
  type: string
  title: string
  posterPath?: string | null
  season?: number | null
  episode?: number | null
  progressSeconds?: number | null
  durationSeconds?: number | null
}

type AddToHistoryUseCaseResponse = Either<ProfileNotFoundError, null>

@Injectable()
export class AddToHistoryUseCase {
  constructor(
    private historyRepository: HistoryRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: AddToHistoryUseCaseRequest,
  ): Promise<AddToHistoryUseCaseResponse> {
    const {
      userId,
      profileId,
      tmdbId,
      type,
      title,
      posterPath,
      season,
      episode,
      progressSeconds,
      durationSeconds,
    } = request

    const isOwner = await this.profileOwnershipGateway.validateOwnership(
      profileId,
      userId,
    )

    if (!isOwner) {
      return left(new ProfileNotFoundError())
    }

    const item = HistoryItem.create({
      profileId,
      tmdbId,
      type,
      title,
      posterPath: posterPath ?? null,
      season: season ?? null,
      episode: episode ?? null,
      progressSeconds: progressSeconds ?? null,
      durationSeconds: durationSeconds ?? null,
    })

    await this.historyRepository.upsertAndCleanup(item, HISTORY_LIMIT)

    return right(null)
  }
}
