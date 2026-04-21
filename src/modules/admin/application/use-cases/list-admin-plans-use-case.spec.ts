import { beforeEach, describe, expect, it } from 'vitest'

import { ListAdminPlansUseCase } from './list-admin-plans-use-case'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { Subscription } from '@/modules/subscription/domain/entities/subscription'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let plansRepository: InMemoryPlansRepository
let subscriptionsRepository: InMemorySubscriptionsRepository
let sut: ListAdminPlansUseCase

describe('ListAdminPlansUseCase', () => {
  beforeEach(() => {
    subscriptionsRepository = new InMemorySubscriptionsRepository()
    plansRepository = new InMemoryPlansRepository(subscriptionsRepository)
    sut = new ListAdminPlansUseCase(plansRepository)
  })

  it('should return an empty list when there are no plans', async () => {
    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.plans).toHaveLength(0)
  })

  it('should return all plans including inactive ones with usersCount', async () => {
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

    const slugs = result.value.plans.map((p) => p.plan.slug)
    expect(slugs).toContain('basico')
    expect(slugs).toContain('legacy')
  })

  it('should return plans in repository order with usersCount shape', async () => {
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
    expect(result.value.plans[0].plan.slug).toBe('premium')
    expect(result.value.plans[1].plan.slug).toBe('basico')
  })

  it('should return usersCount = 0 when plan has no subscriptions', async () => {
    plansRepository.items.push(
      Plan.create(
        {
          name: 'Premium',
          slug: 'premium',
          priceCents: 3990,
          maxProfiles: 5,
          maxStreams: 4,
        },
        new UniqueEntityID('plan-premium'),
      ),
    )

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.plans[0].usersCount).toBe(0)
  })

  it('should return correct usersCount when plan has active subscriptions', async () => {
    plansRepository.items.push(
      Plan.create(
        {
          name: 'Premium',
          slug: 'premium',
          priceCents: 3990,
          maxProfiles: 5,
          maxStreams: 4,
        },
        new UniqueEntityID('plan-premium'),
      ),
    )

    subscriptionsRepository.items.push(
      Subscription.create({ userId: 'user-1', planId: 'plan-premium' }),
      Subscription.create({ userId: 'user-2', planId: 'plan-premium' }),
      Subscription.create({ userId: 'user-3', planId: 'plan-premium' }),
    )

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.plans[0].usersCount).toBe(3)
  })

  it('should count all subscriptions in usersCount regardless of status', async () => {
    plansRepository.items.push(
      Plan.create(
        {
          name: 'Premium',
          slug: 'premium',
          priceCents: 3990,
          maxProfiles: 5,
          maxStreams: 4,
        },
        new UniqueEntityID('plan-premium'),
      ),
    )

    subscriptionsRepository.items.push(
      Subscription.create({
        userId: 'user-1',
        planId: 'plan-premium',
        status: 'active',
      }),
      Subscription.create({
        userId: 'user-2',
        planId: 'plan-premium',
        status: 'canceled',
      }),
      Subscription.create({
        userId: 'user-3',
        planId: 'plan-premium',
        status: 'expired',
      }),
    )

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.plans[0].usersCount).toBe(3)
  })
})
