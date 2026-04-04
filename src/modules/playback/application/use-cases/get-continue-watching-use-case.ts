import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { ProgressRepository } from '../../domain/repositories/progress-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import type { Progress } from '../../domain/entities/progress'

interface GetContinueWatchingUseCaseRequest {
  userId: string
  profileId: string
}

type GetContinueWatchingUseCaseResponse = Either<
  ProfileNotFoundError,
  { items: Progress[] }
>

@Injectable()
export class GetContinueWatchingUseCase {
  constructor(
    private progressRepository: ProgressRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: GetContinueWatchingUseCaseRequest,
  ): Promise<GetContinueWatchingUseCaseResponse> {
    const { userId, profileId } = request

    const isOwner = await this.profileOwnershipGateway.validateOwnership(
      profileId,
      userId,
    )

    if (!isOwner) {
      return left(new ProfileNotFoundError())
    }

    const items = await this.progressRepository.findContinueWatching(profileId)

    return right({ items })
  }
}
