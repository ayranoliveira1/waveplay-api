import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { Favorite } from '../../domain/entities/favorite'
import { FavoritesRepository } from '../../domain/repositories/favorites-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'

interface ToggleFavoriteUseCaseRequest {
  userId: string
  profileId: string
  tmdbId: number
  type: string
  title: string
  posterPath?: string | null
  backdropPath?: string | null
  rating: number
}

type ToggleFavoriteUseCaseResponse = Either<
  ProfileNotFoundError,
  { added: boolean }
>

@Injectable()
export class ToggleFavoriteUseCase {
  constructor(
    private favoritesRepository: FavoritesRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: ToggleFavoriteUseCaseRequest,
  ): Promise<ToggleFavoriteUseCaseResponse> {
    const {
      userId,
      profileId,
      tmdbId,
      type,
      title,
      posterPath,
      backdropPath,
      rating,
    } = request

    const isOwner = await this.profileOwnershipGateway.validateOwnership(
      profileId,
      userId,
    )

    if (!isOwner) {
      return left(new ProfileNotFoundError())
    }

    const favorite = Favorite.create({
      profileId,
      tmdbId,
      type,
      title,
      posterPath: posterPath ?? null,
      backdropPath: backdropPath ?? null,
      rating,
    })

    const added = await this.favoritesRepository.toggle(favorite)

    return right({ added })
  }
}
