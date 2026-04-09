import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { Subscription } from '@/modules/subscription/domain/entities/subscription'
import { SubscriptionsRepository } from '@/modules/subscription/domain/repositories/subscriptions-repository'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { ProfilesRepository } from '@/modules/profile/domain/repositories/profiles-repository'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'
import { AdminUserGatewayPort } from '../ports/admin-user-gateway.port'

interface UpdateUserSubscriptionRequest {
  userId: string
  planId: string
  endsAt?: Date | null
}

type UpdateUserSubscriptionResponse = Either<
  UserNotFoundError | PlanNotFoundError,
  { subscription: Subscription; warning: string | null }
>

@Injectable()
export class UpdateUserSubscriptionUseCase {
  constructor(
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
    private profilesRepository: ProfilesRepository,
    private gateway: AdminUserGatewayPort,
  ) {}

  async execute({
    userId,
    planId,
    endsAt,
  }: UpdateUserSubscriptionRequest): Promise<UpdateUserSubscriptionResponse> {
    const userDetail = await this.gateway.getUserDetail(userId)
    if (!userDetail) {
      return left(new UserNotFoundError())
    }

    const plan = await this.plansRepository.findById(planId)
    if (!plan) {
      return left(new PlanNotFoundError())
    }

    let subscription =
      await this.subscriptionsRepository.findActiveByUserId(userId)

    if (subscription) {
      subscription.planId = plan.id.toValue()
      if (endsAt !== undefined) {
        subscription.endsAt = endsAt
      }
      await this.subscriptionsRepository.save(subscription)
    } else {
      subscription = Subscription.create({
        userId,
        planId: plan.id.toValue(),
        endsAt: endsAt ?? null,
      })
      await this.subscriptionsRepository.create(subscription)
    }

    const profilesCount = await this.profilesRepository.countByUserId(userId)
    const warning =
      profilesCount > plan.maxProfiles
        ? `Usuário tem ${profilesCount} perfis mas o novo plano permite apenas ${plan.maxProfiles}`
        : null

    return right({ subscription, warning })
  }
}
