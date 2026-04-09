import { beforeEach, describe, expect, it } from 'vitest'

import { TogglePlanActiveUseCase } from './toggle-plan-active-use-case'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'

let plansRepository: InMemoryPlansRepository
let sut: TogglePlanActiveUseCase

describe('TogglePlanActiveUseCase', () => {
  beforeEach(() => {
    plansRepository = new InMemoryPlansRepository()
    sut = new TogglePlanActiveUseCase(plansRepository)
  })

  it('should deactivate an active plan', async () => {
    plansRepository.items.push(
      Plan.create(
        {
          name: 'Premium',
          slug: 'premium',
          priceCents: 3990,
          maxProfiles: 5,
          maxStreams: 4,
          active: true,
        },
        new UniqueEntityID('plan-premium'),
      ),
    )

    const result = await sut.execute({ planId: 'plan-premium' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.plan.active).toBe(false)
    }
  })

  it('should reactivate an inactive plan', async () => {
    plansRepository.items.push(
      Plan.create(
        {
          name: 'Premium',
          slug: 'premium',
          priceCents: 3990,
          maxProfiles: 5,
          maxStreams: 4,
          active: false,
        },
        new UniqueEntityID('plan-premium'),
      ),
    )

    const result = await sut.execute({ planId: 'plan-premium' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.plan.active).toBe(true)
    }
  })

  it('should return PlanNotFoundError when plan does not exist', async () => {
    const result = await sut.execute({ planId: 'nonexistent-plan' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PlanNotFoundError)
  })
})
