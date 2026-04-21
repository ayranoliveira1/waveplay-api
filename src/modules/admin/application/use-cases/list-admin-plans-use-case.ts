import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import type { Plan } from '@/modules/subscription/domain/entities/plan'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'

export interface PlanWithCount {
  plan: Plan
  usersCount: number
}

type ListAdminPlansResponse = Either<never, { plans: PlanWithCount[] }>

@Injectable()
export class ListAdminPlansUseCase {
  constructor(private plansRepository: PlansRepository) {}

  async execute(): Promise<ListAdminPlansResponse> {
    const plans = await this.plansRepository.findAllAdmin()

    const plansWithCount = await Promise.all(
      plans.map(async (plan) => ({
        plan,
        usersCount: await this.plansRepository.countSubscriptionsByPlanId(
          plan.id.toValue(),
        ),
      })),
    )

    return right({ plans: plansWithCount })
  }
}
