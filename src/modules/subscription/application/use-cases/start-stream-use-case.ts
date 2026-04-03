import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { ActiveStream } from '../../domain/entities/active-stream'
import type { StreamContentType } from '../../domain/entities/active-stream'
import { ActiveStreamsRepository } from '../../domain/repositories/active-streams-repository'
import { SubscriptionsRepository } from '../../domain/repositories/subscriptions-repository'
import { PlansRepository } from '../../domain/repositories/plans-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { StreamCachePort } from '../ports/stream-cache.port'
import { MaxStreamsReachedError } from '../../domain/errors/max-streams-reached.error'
import { MaxStreamsReachedWithListError } from '../../domain/errors/max-streams-reached-with-list.error'
import { StreamNotFoundError } from '../../domain/errors/stream-not-found.error'
import { STREAM_TIMEOUT_MS } from '../../domain/constants/stream-timeout'

interface StartStreamUseCaseRequest {
  userId: string
  profileId: string
  tmdbId: number
  type: StreamContentType
  title: string
}

type StartStreamUseCaseResponse = Either<
  MaxStreamsReachedWithListError | StreamNotFoundError,
  { streamId: string }
>

@Injectable()
export class StartStreamUseCase {
  constructor(
    private activeStreamsRepository: ActiveStreamsRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
    private streamCache: StreamCachePort,
  ) {}

  async execute(
    request: StartStreamUseCaseRequest,
  ): Promise<StartStreamUseCaseResponse> {
    const { userId, profileId, tmdbId, type, title } = request

    const isOwner = await this.profileOwnershipGateway.validateOwnership(
      profileId,
      userId,
    )

    if (!isOwner) {
      return left(new StreamNotFoundError())
    }

    let maxStreams = 1

    const subscription =
      await this.subscriptionsRepository.findActiveByUserId(userId)

    if (subscription) {
      const plan = await this.plansRepository.findById(subscription.planId)
      if (plan) {
        maxStreams = plan.maxStreams
      }
    }

    const stream = ActiveStream.create({
      userId,
      profileId,
      tmdbId,
      type,
    })

    try {
      await this.activeStreamsRepository.createOrUpdate(stream, maxStreams)
    } catch (error) {
      if (error instanceof MaxStreamsReachedError) {
        const activeStreams = await this.streamCache.getActiveStreams(
          userId,
          STREAM_TIMEOUT_MS,
        )
        return left(
          new MaxStreamsReachedWithListError(maxStreams, activeStreams),
        )
      }
      throw error
    }

    const profileName =
      (await this.profileOwnershipGateway.getProfileName(profileId)) ?? 'Perfil'

    await this.streamCache.addStream({
      userId,
      profileId,
      profileName,
      streamId: stream.id.toValue(),
      tmdbId,
      type,
      title,
      startedAt: stream.startedAt,
    })

    return right({ streamId: stream.id.toValue() })
  }
}
