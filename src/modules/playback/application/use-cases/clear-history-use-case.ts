import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { HistoryRepository } from '../../domain/repositories/history-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'

interface ClearHistoryUseCaseRequest {
  userId: string
  profileId: string
}

type ClearHistoryUseCaseResponse = Either<ProfileNotFoundError, null>

@Injectable()
export class ClearHistoryUseCase {
  constructor(
    private historyRepository: HistoryRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: ClearHistoryUseCaseRequest,
  ): Promise<ClearHistoryUseCaseResponse> {
    const { userId, profileId } = request

    const isOwner = await this.profileOwnershipGateway.validateOwnership(
      profileId,
      userId,
    )

    if (!isOwner) {
      return left(new ProfileNotFoundError())
    }

    await this.historyRepository.deleteAllByProfileId(profileId)

    return right(null)
  }
}
