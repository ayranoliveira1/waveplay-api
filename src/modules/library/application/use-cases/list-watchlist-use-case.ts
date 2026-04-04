import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { WatchlistRepository } from '../../domain/repositories/watchlist-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import type { WatchlistItem } from '../../domain/entities/watchlist-item'

const PER_PAGE = 20

interface ListWatchlistUseCaseRequest {
  userId: string
  profileId: string
  page: number
}

type ListWatchlistUseCaseResponse = Either<
  ProfileNotFoundError,
  { items: WatchlistItem[]; page: number; totalPages: number }
>

@Injectable()
export class ListWatchlistUseCase {
  constructor(
    private watchlistRepository: WatchlistRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: ListWatchlistUseCaseRequest,
  ): Promise<ListWatchlistUseCaseResponse> {
    const { userId, profileId, page } = request

    const isOwner = await this.profileOwnershipGateway.validateOwnership(
      profileId,
      userId,
    )

    if (!isOwner) {
      return left(new ProfileNotFoundError())
    }

    const [items, total] = await Promise.all([
      this.watchlistRepository.findByProfileId(profileId, page, PER_PAGE),
      this.watchlistRepository.countByProfileId(profileId),
    ])

    return right({
      items,
      page,
      totalPages: Math.ceil(total / PER_PAGE) || 1,
    })
  }
}
