import { Injectable } from '@nestjs/common'

import { Either, right } from '@/core/either'
import type { Plan } from '../../domain/entities/plan'
import { PlansRepository } from '../../domain/repositories/plans-repository'

type ListPlansUseCaseResponse = Either<never, { plans: Plan[] }>

@Injectable()
export class ListPlansUseCase {
  constructor(private plansRepository: PlansRepository) {}

  async execute(): Promise<ListPlansUseCaseResponse> {
    const plans = await this.plansRepository.findAll()

    return right({ plans })
  }
}
