import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { DomainEvents } from '@/core/events/domain-events'
import { OnUserRegisteredSubscription } from './on-user-registered'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { User } from '@/modules/identity/domain/entities/user'
import { Plan } from '../../domain/entities/plan'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let subscriptionsRepository: InMemorySubscriptionsRepository
let plansRepository: InMemoryPlansRepository
let sut: OnUserRegisteredSubscription

describe('OnUserRegisteredSubscription', () => {
  beforeEach(() => {
    subscriptionsRepository = new InMemorySubscriptionsRepository()
    plansRepository = new InMemoryPlansRepository()

    // Seed plano básico
    const basicPlan = Plan.create(
      {
        name: 'Básico',
        slug: 'basico',
        priceCents: 0,
        maxProfiles: 1,
        maxStreams: 1,
      },
      new UniqueEntityID('plan-basico-id'),
    )
    plansRepository.items.push(basicPlan)

    sut = new OnUserRegisteredSubscription(
      subscriptionsRepository,
      plansRepository,
    )
    sut.setupSubscriptions()
  })

  afterEach(() => {
    DomainEvents.clearHandlers()
    DomainEvents.clearMarkedAggregates()
  })

  it('should create a subscription when a new user is registered', async () => {
    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: 'hash',
    })

    DomainEvents.dispatchEventsForAggregate(user.id)

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(subscriptionsRepository.items).toHaveLength(1)
    expect(subscriptionsRepository.items[0].userId).toBe(user.id.toValue())
    expect(subscriptionsRepository.items[0].planId).toBe('plan-basico-id')
    expect(subscriptionsRepository.items[0].status).toBe('active')
  })

  it('should not create subscription when plan basico is not found', async () => {
    plansRepository.items = []

    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: 'hash',
    })

    DomainEvents.dispatchEventsForAggregate(user.id)

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(subscriptionsRepository.items).toHaveLength(0)
  })

  it('should not create subscription when user is reconstituted (has existing id)', async () => {
    const user = User.create(
      {
        name: 'João Silva',
        email: 'joao@email.com',
        passwordHash: 'hash',
      },
      new UniqueEntityID('existing-id'),
    )

    expect(user.domainEvents).toHaveLength(0)

    DomainEvents.dispatchEventsForAggregate(user.id)

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(subscriptionsRepository.items).toHaveLength(0)
  })
})
