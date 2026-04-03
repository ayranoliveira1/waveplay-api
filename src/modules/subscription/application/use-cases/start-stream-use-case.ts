import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { ActiveStream } from '../../domain/entities/active-stream'
import type { StreamContentType } from '../../domain/entities/active-stream'
import { ActiveStreamsRepository } from '../../domain/repositories/active-streams-repository'
import { SubscriptionsRepository } from '../../domain/repositories/subscriptions-repository'
import { PlansRepository } from '../../domain/repositories/plans-repository'
import { ProfileOwnershipGatewayPort } from '../ports/profile-ownership-gateway.port'
import { MaxStreamsReachedError } from '../../domain/errors/max-streams-reached.error'
import { StreamNotFoundError } from '../../domain/errors/stream-not-found.error'

interface StartStreamUseCaseRequest {
  userId: string
  profileId: string
  tmdbId: number
  type: StreamContentType
}

type StartStreamUseCaseResponse = Either<
  MaxStreamsReachedError | StreamNotFoundError,
  { streamId: string }
>

@Injectable()
export class StartStreamUseCase {
  constructor(
    private activeStreamsRepository: ActiveStreamsRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
    private profileOwnershipGateway: ProfileOwnershipGatewayPort,
  ) {}

  async execute(
    request: StartStreamUseCaseRequest,
  ): Promise<StartStreamUseCaseResponse> {
    const { userId, profileId, tmdbId, type } = request

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
        return left(error)
      }
      throw error
    }

    return right({ streamId: stream.id.toValue() })
  }
}
