import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { FavoritesRepository } from '../../domain/repositories/favorites-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import type { Favorite } from '../../domain/entities/favorite'

const PER_PAGE = 20

interface ListFavoritesUseCaseRequest {
  userId: string
  profileId: string
  page: number
}

type ListFavoritesUseCaseResponse = Either<
  ProfileNotFoundError,
  { favorites: Favorite[]; page: number; totalPages: number }
>

@Injectable()
export class ListFavoritesUseCase {
  constructor(
    private favoritesRepository: FavoritesRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: ListFavoritesUseCaseRequest,
  ): Promise<ListFavoritesUseCaseResponse> {
    const { userId, profileId, page } = request

    const isOwner = await this.profileOwnershipGateway.validateOwnership(
      profileId,
      userId,
    )

    if (!isOwner) {
      return left(new ProfileNotFoundError())
    }

    const [favorites, total] = await Promise.all([
      this.favoritesRepository.findByProfileId(profileId, page, PER_PAGE),
      this.favoritesRepository.countByProfileId(profileId),
    ])

    return right({
      favorites,
      page,
      totalPages: Math.ceil(total / PER_PAGE) || 1,
    })
  }
}
