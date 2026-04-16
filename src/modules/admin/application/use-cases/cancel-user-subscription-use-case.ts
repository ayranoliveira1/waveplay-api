import { Injectable, Logger } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { SubscriptionsRepository } from '@/modules/subscription/domain/repositories/subscriptions-repository'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'
import { SubscriptionNotFoundError } from '../../domain/errors/subscription-not-found.error'
import type { Subscription } from '@/modules/subscription/domain/entities/subscription'

interface CancelUserSubscriptionRequest {
  userId: string
}

type CancelUserSubscriptionResponse = Either<
  UserNotFoundError | SubscriptionNotFoundError,
  { subscription: Subscription }
>

@Injectable()
export class CancelUserSubscriptionUseCase {
  private readonly logger = new Logger(CancelUserSubscriptionUseCase.name)

  constructor(
    private usersRepository: UsersRepository,
    private subscriptionsRepository: SubscriptionsRepository,
  ) {}

  async execute({
    userId,
  }: CancelUserSubscriptionRequest): Promise<CancelUserSubscriptionResponse> {
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      return left(new UserNotFoundError())
    }

    const subscription =
      await this.subscriptionsRepository.findActiveByUserId(userId)
    if (!subscription) {
      return left(new SubscriptionNotFoundError())
    }

    subscription.cancel()
    await this.subscriptionsRepository.save(subscription)

    this.logger.log(
      `Admin canceled subscription ${subscription.id.toValue()} for user: ${userId}`,
    )

    return right({ subscription })
  }
}
