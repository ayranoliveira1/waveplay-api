import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { SlugAlreadyExistsError } from '../../domain/errors/slug-already-exists.error'

interface CreatePlanRequest {
  name: string
  slug: string
  priceCents: number
  maxProfiles: number
  maxStreams: number
  description?: string
}

type CreatePlanResponse = Either<SlugAlreadyExistsError, { plan: Plan }>

@Injectable()
export class CreatePlanUseCase {
  constructor(private plansRepository: PlansRepository) {}

  async execute(request: CreatePlanRequest): Promise<CreatePlanResponse> {
    const existing = await this.plansRepository.findBySlug(request.slug)
    if (existing) {
      return left(new SlugAlreadyExistsError())
    }

    const plan = Plan.create({
      name: request.name,
      slug: request.slug,
      priceCents: request.priceCents,
      maxProfiles: request.maxProfiles,
      maxStreams: request.maxStreams,
      description: request.description ?? null,
      active: true,
    })

    await this.plansRepository.create(plan)

    return right({ plan })
  }
}
