import { beforeEach, describe, expect, it } from 'vitest'

import { ListAdminPlansUseCase } from './list-admin-plans-use-case'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let plansRepository: InMemoryPlansRepository
let sut: ListAdminPlansUseCase

describe('ListAdminPlansUseCase', () => {
  beforeEach(() => {
    plansRepository = new InMemoryPlansRepository()
    sut = new ListAdminPlansUseCase(plansRepository)
  })

  it('should return an empty list when there are no plans', async () => {
    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.plans).toHaveLength(0)
  })

  it('should return all plans including inactive ones', async () => {
    const activePlan = Plan.create(
      {
        name: 'Basico',
        slug: 'basico',
        priceCents: 990,
        maxProfiles: 1,
        maxStreams: 1,
        active: true,
      },
      new UniqueEntityID('plan-1'),
    )

    const inactivePlan = Plan.create(
      {
        name: 'Legacy',
        slug: 'legacy',
        priceCents: 500,
        maxProfiles: 1,
        maxStreams: 1,
        active: false,
      },
      new UniqueEntityID('plan-2'),
    )

    plansRepository.items.push(activePlan, inactivePlan)

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.plans).toHaveLength(2)

    const slugs = result.value.plans.map((p) => p.slug)
    expect(slugs).toContain('basico')
    expect(slugs).toContain('legacy')
  })

  it('should return plans in repository order', async () => {
    plansRepository.items.push(
      Plan.create({
        name: 'Premium',
        slug: 'premium',
        priceCents: 3990,
        maxProfiles: 5,
        maxStreams: 4,
      }),
      Plan.create({
        name: 'Basico',
        slug: 'basico',
        priceCents: 990,
        maxProfiles: 1,
        maxStreams: 1,
      }),
    )

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.plans[0].slug).toBe('premium')
    expect(result.value.plans[1].slug).toBe('basico')
  })
})
