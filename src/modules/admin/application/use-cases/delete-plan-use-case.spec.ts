import { beforeEach, describe, expect, it } from 'vitest'

import { DeletePlanUseCase } from './delete-plan-use-case'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { Subscription } from '@/modules/subscription/domain/entities/subscription'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'
import { PlanHasSubscriptionsError } from '../../domain/errors/plan-has-subscriptions.error'

let subscriptionsRepository: InMemorySubscriptionsRepository
let plansRepository: InMemoryPlansRepository
let sut: DeletePlanUseCase

describe('DeletePlanUseCase', () => {
  beforeEach(() => {
    subscriptionsRepository = new InMemorySubscriptionsRepository()
    plansRepository = new InMemoryPlansRepository(subscriptionsRepository)
    sut = new DeletePlanUseCase(plansRepository)
  })

  it('should delete a plan without any subscriptions', async () => {
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

    const result = await sut.execute({ planId: 'plan-premium' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.deleted).toBe(true)
    }
    expect(plansRepository.items).toHaveLength(0)
  })

  it('should return PlanHasSubscriptionsError when plan has active subscriptions', async () => {
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
    )

    const result = await sut.execute({ planId: 'plan-premium' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PlanHasSubscriptionsError)
    expect(plansRepository.items).toHaveLength(1)
  })

  it('should return PlanHasSubscriptionsError when plan has only canceled/expired subscriptions', async () => {
    plansRepository.items.push(
      Plan.create(
        {
          name: 'Legacy',
          slug: 'legacy',
          priceCents: 500,
          maxProfiles: 1,
          maxStreams: 1,
        },
        new UniqueEntityID('plan-legacy'),
      ),
    )

    subscriptionsRepository.items.push(
      Subscription.create({
        userId: 'user-1',
        planId: 'plan-legacy',
        status: 'canceled',
      }),
      Subscription.create({
        userId: 'user-2',
        planId: 'plan-legacy',
        status: 'expired',
      }),
    )

    const result = await sut.execute({ planId: 'plan-legacy' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PlanHasSubscriptionsError)
    expect(plansRepository.items).toHaveLength(1)
  })

  it('should return PlanNotFoundError when plan does not exist', async () => {
    const result = await sut.execute({ planId: 'nonexistent-plan' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PlanNotFoundError)
  })
})
