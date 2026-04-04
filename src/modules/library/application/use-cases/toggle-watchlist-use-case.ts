import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { WatchlistItem } from '../../domain/entities/watchlist-item'
import { WatchlistRepository } from '../../domain/repositories/watchlist-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'

interface ToggleWatchlistUseCaseRequest {
  userId: string
  profileId: string
  tmdbId: number
  type: string
  title: string
  posterPath?: string | null
  backdropPath?: string | null
  rating: number
}

type ToggleWatchlistUseCaseResponse = Either<
  ProfileNotFoundError,
  { added: boolean }
>

@Injectable()
export class ToggleWatchlistUseCase {
  constructor(
    private watchlistRepository: WatchlistRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: ToggleWatchlistUseCaseRequest,
  ): Promise<ToggleWatchlistUseCaseResponse> {
    const { userId, profileId, tmdbId, type, title, posterPath, backdropPath, rating } = request

    const isOwner = await this.profileOwnershipGateway.validateOwnership(
      profileId,
      userId,
    )

    if (!isOwner) {
      return left(new ProfileNotFoundError())
    }

    const existing = await this.watchlistRepository.findByProfileAndTmdb(
      profileId,
      tmdbId,
      type,
    )

    if (existing) {
      await this.watchlistRepository.delete(existing.id.toValue())
      return right({ added: false })
    }

    const item = WatchlistItem.create({
      profileId,
      tmdbId,
      type,
      title,
      posterPath: posterPath ?? null,
      backdropPath: backdropPath ?? null,
      rating,
    })

    await this.watchlistRepository.create(item)

    return right({ added: true })
  }
}
