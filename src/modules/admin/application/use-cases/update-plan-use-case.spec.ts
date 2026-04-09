import { beforeEach, describe, expect, it } from 'vitest'

import { UpdatePlanUseCase } from './update-plan-use-case'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'

let plansRepository: InMemoryPlansRepository
let sut: UpdatePlanUseCase

describe('UpdatePlanUseCase', () => {
  beforeEach(() => {
    plansRepository = new InMemoryPlansRepository()
    sut = new UpdatePlanUseCase(plansRepository)

    plansRepository.items.push(
      Plan.create(
        {
          name: 'Padrão',
          slug: 'padrao',
          priceCents: 1990,
          maxProfiles: 3,
          maxStreams: 2,
          description: 'Plano padrão',
        },
        new UniqueEntityID('plan-padrao'),
      ),
    )
  })

  it('should update only provided fields (partial update preserves others)', async () => {
    const result = await sut.execute({
      planId: 'plan-padrao',
      priceCents: 2490,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.plan.priceCents).toBe(2490)
      expect(result.value.plan.name).toBe('Padrão')
      expect(result.value.plan.slug).toBe('padrao')
      expect(result.value.plan.maxProfiles).toBe(3)
      expect(result.value.plan.maxStreams).toBe(2)
      expect(result.value.plan.description).toBe('Plano padrão')
    }
  })

  it('should allow clearing description with null', async () => {
    const result = await sut.execute({
      planId: 'plan-padrao',
      description: null,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.plan.description).toBeNull()
    }
  })

  it('should return PlanNotFoundError when plan does not exist', async () => {
    const result = await sut.execute({
      planId: 'nonexistent-plan',
      name: 'Novo Nome',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PlanNotFoundError)
  })
})
