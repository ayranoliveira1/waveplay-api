import { beforeEach, describe, expect, it } from 'vitest'

import { CreatePlanUseCase } from './create-plan-use-case'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { SlugAlreadyExistsError } from '../../domain/errors/slug-already-exists.error'

let plansRepository: InMemoryPlansRepository
let sut: CreatePlanUseCase

describe('CreatePlanUseCase', () => {
  beforeEach(() => {
    plansRepository = new InMemoryPlansRepository()
    sut = new CreatePlanUseCase(plansRepository)
  })

  it('should create plan with defaults (active=true, description=null)', async () => {
    const result = await sut.execute({
      name: 'Premium',
      slug: 'premium',
      priceCents: 3990,
      maxProfiles: 5,
      maxStreams: 4,
    })

    expect(result.isRight()).toBe(true)
    expect(plansRepository.items).toHaveLength(1)

    if (result.isRight()) {
      expect(result.value.plan.name).toBe('Premium')
      expect(result.value.plan.slug).toBe('premium')
      expect(result.value.plan.priceCents).toBe(3990)
      expect(result.value.plan.maxProfiles).toBe(5)
      expect(result.value.plan.maxStreams).toBe(4)
      expect(result.value.plan.description).toBeNull()
      expect(result.value.plan.active).toBe(true)
    }
  })

  it('should return SlugAlreadyExistsError when slug exists', async () => {
    plansRepository.items.push(
      Plan.create(
        {
          name: 'Premium',
          slug: 'premium',
          priceCents: 3990,
          maxProfiles: 5,
          maxStreams: 4,
        },
        new UniqueEntityID('existing-plan'),
      ),
    )

    const result = await sut.execute({
      name: 'Premium Duplicado',
      slug: 'premium',
      priceCents: 4990,
      maxProfiles: 6,
      maxStreams: 5,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SlugAlreadyExistsError)
    expect(plansRepository.items).toHaveLength(1)
  })
})
