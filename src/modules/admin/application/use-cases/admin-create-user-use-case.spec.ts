import { beforeEach, describe, expect, it } from 'vitest'

import { AdminCreateUserUseCase } from './admin-create-user-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { User } from '@/modules/identity/domain/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { EmailAlreadyExistsError } from '@/modules/identity/domain/errors/email-already-exists.error'
import { WeakPasswordError } from '@/modules/identity/domain/errors/weak-password.error'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'
import { InvalidSubscriptionEndDateError } from '../../domain/errors/invalid-subscription-end-date.error'

let usersRepository: InMemoryUsersRepository
let plansRepository: InMemoryPlansRepository
let subscriptionsRepository: InMemorySubscriptionsRepository
let profilesRepository: InMemoryProfilesRepository
let hasher: FakeHasher
let sut: AdminCreateUserUseCase

describe('AdminCreateUserUseCase', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository()
    plansRepository = new InMemoryPlansRepository()
    subscriptionsRepository = new InMemorySubscriptionsRepository()
    profilesRepository = new InMemoryProfilesRepository()
    hasher = new FakeHasher()

    sut = new AdminCreateUserUseCase(
      usersRepository,
      hasher,
      plansRepository,
      subscriptionsRepository,
      profilesRepository,
    )

    plansRepository.items.push(
      Plan.create(
        {
          name: 'Padrão',
          slug: 'padrao',
          priceCents: 1990,
          maxProfiles: 3,
          maxStreams: 2,
        },
        new UniqueEntityID('plan-padrao'),
      ),
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
  })

  it('should create user with subscription and first profile', async () => {
    const result = await sut.execute({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'Abc12345',
      planId: 'plan-premium',
    })

    expect(result.isRight()).toBe(true)
    expect(usersRepository.items).toHaveLength(1)
    expect(usersRepository.items[0].passwordHash).toBe('Abc12345-hashed')

    expect(subscriptionsRepository.items).toHaveLength(1)
    expect(subscriptionsRepository.items[0].planId).toBe('plan-premium')
    expect(subscriptionsRepository.items[0].userId).toBe(
      usersRepository.items[0].id.toValue(),
    )

    expect(profilesRepository.items).toHaveLength(1)
    expect(profilesRepository.items[0].name).toBe('Alice')
    expect(profilesRepository.items[0].userId).toBe(
      usersRepository.items[0].id.toValue(),
    )
  })

  it('should use the specified planId (not the default basico)', async () => {
    await sut.execute({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'Abc12345',
      planId: 'plan-padrao',
    })

    expect(subscriptionsRepository.items[0].planId).toBe('plan-padrao')
  })

  it('should return EmailAlreadyExistsError when email is duplicated', async () => {
    usersRepository.items.push(
      User.create({
        name: 'Existing',
        email: 'duplicate@test.com',
        passwordHash: 'hash',
      }),
    )

    const result = await sut.execute({
      name: 'New',
      email: 'duplicate@test.com',
      password: 'Abc12345',
      planId: 'plan-padrao',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(EmailAlreadyExistsError)
    expect(usersRepository.items).toHaveLength(1)
  })

  it('should return WeakPasswordError when password is weak', async () => {
    const result = await sut.execute({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'weak',
      planId: 'plan-padrao',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WeakPasswordError)
    expect(usersRepository.items).toHaveLength(0)
  })

  it('should return PlanNotFoundError when plan does not exist', async () => {
    const result = await sut.execute({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'Abc12345',
      planId: 'nonexistent-plan',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PlanNotFoundError)
    expect(usersRepository.items).toHaveLength(0)
    expect(subscriptionsRepository.items).toHaveLength(0)
    expect(profilesRepository.items).toHaveLength(0)
  })

  it('should create user with endsAt when provided', async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const result = await sut.execute({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'Abc12345',
      planId: 'plan-premium',
      endsAt: futureDate,
    })

    expect(result.isRight()).toBe(true)
    expect(subscriptionsRepository.items).toHaveLength(1)
    expect(subscriptionsRepository.items[0].endsAt).toEqual(futureDate)
  })

  it('should create user with endsAt=null when not provided', async () => {
    const result = await sut.execute({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'Abc12345',
      planId: 'plan-premium',
    })

    expect(result.isRight()).toBe(true)
    expect(subscriptionsRepository.items[0].endsAt).toBeNull()
  })

  it('should return InvalidSubscriptionEndDateError when endsAt is in the past', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const result = await sut.execute({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'Abc12345',
      planId: 'plan-premium',
      endsAt: pastDate,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSubscriptionEndDateError)
    expect(usersRepository.items).toHaveLength(0)
    expect(subscriptionsRepository.items).toHaveLength(0)
    expect(profilesRepository.items).toHaveLength(0)
  })
})
