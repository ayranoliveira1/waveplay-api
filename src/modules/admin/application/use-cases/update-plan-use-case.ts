import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import type { Plan } from '@/modules/subscription/domain/entities/plan'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'

interface UpdatePlanRequest {
  planId: string
  name?: string
  priceCents?: number
  maxProfiles?: number
  maxStreams?: number
  description?: string | null
}

type UpdatePlanResponse = Either<PlanNotFoundError, { plan: Plan }>

@Injectable()
export class UpdatePlanUseCase {
  constructor(private plansRepository: PlansRepository) {}

  async execute(request: UpdatePlanRequest): Promise<UpdatePlanResponse> {
    const plan = await this.plansRepository.findById(request.planId)
    if (!plan) {
      return left(new PlanNotFoundError())
    }

    if (request.name !== undefined) {
      plan.name = request.name
    }
    if (request.priceCents !== undefined) {
      plan.priceCents = request.priceCents
    }
    if (request.maxProfiles !== undefined) {
      plan.maxProfiles = request.maxProfiles
    }
    if (request.maxStreams !== undefined) {
      plan.maxStreams = request.maxStreams
    }
    if (request.description !== undefined) {
      plan.description = request.description
    }

    await this.plansRepository.save(plan)

    return right({ plan })
  }
}
