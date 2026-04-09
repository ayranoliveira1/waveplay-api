import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import type { Plan } from '@/modules/subscription/domain/entities/plan'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'

interface TogglePlanActiveRequest {
  planId: string
}

type TogglePlanActiveResponse = Either<PlanNotFoundError, { plan: Plan }>

@Injectable()
export class TogglePlanActiveUseCase {
  constructor(private plansRepository: PlansRepository) {}

  async execute({
    planId,
  }: TogglePlanActiveRequest): Promise<TogglePlanActiveResponse> {
    const plan = await this.plansRepository.findById(planId)
    if (!plan) {
      return left(new PlanNotFoundError())
    }

    plan.active = !plan.active

    await this.plansRepository.save(plan)

    return right({ plan })
  }
}
