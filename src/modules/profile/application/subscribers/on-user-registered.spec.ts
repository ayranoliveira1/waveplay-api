import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { DomainEvents } from '@/core/events/domain-events'
import { OnUserRegistered } from './on-user-registered'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { FakeUserPlanGateway } from 'test/ports/fake-user-plan-gateway'
import { User } from '@/modules/identity/domain/entities/user'

let profilesRepository: InMemoryProfilesRepository
let userPlanGateway: FakeUserPlanGateway
let sut: OnUserRegistered

describe('OnUserRegistered', () => {
  beforeEach(() => {
    profilesRepository = new InMemoryProfilesRepository()
    userPlanGateway = new FakeUserPlanGateway()

    sut = new OnUserRegistered(profilesRepository, userPlanGateway)
    sut.setupSubscriptions()
  })

  afterEach(() => {
    DomainEvents.clearHandlers()
    DomainEvents.clearMarkedAggregates()
  })

  it('should create a profile when a new user is registered', async () => {
    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: 'hash',
    })

    DomainEvents.dispatchEventsForAggregate(user.id)

    // Aguarda o handler async executar
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(profilesRepository.items).toHaveLength(1)
    expect(profilesRepository.items[0].name).toBe('João Silva')
    expect(profilesRepository.items[0].userId).toBe(user.id.toValue())
  })

  it('should create profile with correct userId', async () => {
    const user = User.create({
      name: 'Maria Santos',
      email: 'maria@email.com',
      passwordHash: 'hash',
    })

    DomainEvents.dispatchEventsForAggregate(user.id)

    await new Promise((resolve) => setTimeout(resolve, 10))

    const profile = profilesRepository.items[0]
    expect(profile.userId).toBe(user.id.toValue())
    expect(profile.name).toBe('Maria Santos')
    expect(profile.isKid).toBe(false)
    expect(profile.avatarUrl).toBeNull()
  })

  it('should not create profile when user is reconstituted (has existing id)', async () => {
    const { UniqueEntityID } = await import(
      '@/core/entities/unique-entity-id'
    )

    // User com id existente (reconstituído do banco) não emite evento
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

    expect(profilesRepository.items).toHaveLength(0)
  })
})
