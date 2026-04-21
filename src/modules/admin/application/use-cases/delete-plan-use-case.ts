import { Injectable, Logger } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'
import { PlanHasSubscriptionsError } from '../../domain/errors/plan-has-subscriptions.error'

interface DeletePlanRequest {
  planId: string
}

type DeletePlanResponse = Either<
  PlanNotFoundError | PlanHasSubscriptionsError,
  { deleted: true }
>

@Injectable()
export class DeletePlanUseCase {
  private readonly logger = new Logger(DeletePlanUseCase.name)

  constructor(private plansRepository: PlansRepository) {}

  async execute({ planId }: DeletePlanRequest): Promise<DeletePlanResponse> {
    const plan = await this.plansRepository.findById(planId)
    if (!plan) {
      return left(new PlanNotFoundError())
    }

    const subscriptionsCount =
      await this.plansRepository.countSubscriptionsByPlanId(planId)
    if (subscriptionsCount > 0) {
      return left(new PlanHasSubscriptionsError())
    }

    await this.plansRepository.delete(planId)

    this.logger.log(`Admin hard-deleted plan: ${planId}`)

    return right({ deleted: true })
  }
}
