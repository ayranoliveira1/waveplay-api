import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { HistoryRepository } from '../../domain/repositories/history-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import type { HistoryItem } from '../../domain/entities/history-item'

const PER_PAGE = 20

interface ListHistoryUseCaseRequest {
  userId: string
  profileId: string
  page: number
}

type ListHistoryUseCaseResponse = Either<
  ProfileNotFoundError,
  { items: HistoryItem[]; page: number; totalPages: number }
>

@Injectable()
export class ListHistoryUseCase {
  constructor(
    private historyRepository: HistoryRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: ListHistoryUseCaseRequest,
  ): Promise<ListHistoryUseCaseResponse> {
    const { userId, profileId, page } = request

    const isOwner = await this.profileOwnershipGateway.validateOwnership(
      profileId,
      userId,
    )

    if (!isOwner) {
      return left(new ProfileNotFoundError())
    }

    const [items, total] = await Promise.all([
      this.historyRepository.findByProfileId(profileId, page, PER_PAGE),
      this.historyRepository.countByProfileId(profileId),
    ])

    return right({
      items,
      page,
      totalPages: Math.ceil(total / PER_PAGE) || 1,
    })
  }
}
