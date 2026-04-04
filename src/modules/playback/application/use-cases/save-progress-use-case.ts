import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { Progress } from '../../domain/entities/progress'
import { ProgressRepository } from '../../domain/repositories/progress-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'

interface SaveProgressUseCaseRequest {
  userId: string
  profileId: string
  tmdbId: number
  type: string
  season?: number | null
  episode?: number | null
  progressSeconds: number
  durationSeconds: number
}

type SaveProgressUseCaseResponse = Either<ProfileNotFoundError, null>

@Injectable()
export class SaveProgressUseCase {
  constructor(
    private progressRepository: ProgressRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: SaveProgressUseCaseRequest,
  ): Promise<SaveProgressUseCaseResponse> {
    const {
      userId,
      profileId,
      tmdbId,
      type,
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

    const progress = Progress.create({
      profileId,
      tmdbId,
      type,
      season: season ?? null,
      episode: episode ?? null,
      progressSeconds,
      durationSeconds,
    })

    await this.progressRepository.upsert(progress)

    return right(null)
  }
}
