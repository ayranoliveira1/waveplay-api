import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import type { Plan } from '@/modules/subscription/domain/entities/plan'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'

type ListAdminPlansResponse = Either<never, { plans: Plan[] }>

@Injectable()
export class ListAdminPlansUseCase {
  constructor(private plansRepository: PlansRepository) {}

  async execute(): Promise<ListAdminPlansResponse> {
    const plans = await this.plansRepository.findAllAdmin()

    return right({ plans })
  }
}
