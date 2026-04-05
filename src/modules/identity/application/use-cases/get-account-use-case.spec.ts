import { describe, it, expect, beforeEach } from 'vitest'

import { GetAccountUseCase } from './get-account-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { FakeAccountGateway } from 'test/ports/fake-account-gateway'
import { User } from '../../domain/entities/user'
import { ResourceNotFoundError } from '@/core/errors/errors/resource-not-found-error'

let usersRepository: InMemoryUsersRepository
let accountGateway: FakeAccountGateway
let sut: GetAccountUseCase

describe('GetAccountUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    accountGateway = new FakeAccountGateway()

    sut = new GetAccountUseCase(usersRepository, accountGateway)

    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: '12345678-hashed',
    })

    await usersRepository.create(user)
  })

  it('should return user with active subscription', async () => {
    accountGateway.subscription = {
      id: 'sub-1',
      status: 'active',
      startedAt: new Date('2026-01-01'),
      endsAt: new Date('2026-12-31'),
      plan: {
        id: 'plan-1',
        name: 'Premium',
        slug: 'premium',
        maxProfiles: 5,
        maxStreams: 3,
      },
    }

    const userId = usersRepository.items[0].id.toValue()
    const result = await sut.execute({ userId })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.user).toBeInstanceOf(User)
      expect(result.value.user.email).toBe('joao@email.com')
      expect(result.value.subscription).not.toBeNull()
      expect(result.value.subscription?.plan.name).toBe('Premium')
      expect(result.value.subscription?.status).toBe('active')
    }
  })

  it('should return user with null subscription when none active', async () => {
    const userId = usersRepository.items[0].id.toValue()
    const result = await sut.execute({ userId })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.user).toBeInstanceOf(User)
      expect(result.value.subscription).toBeNull()
    }
  })

  it('should return error when user is not found', async () => {
    const result = await sut.execute({ userId: 'non-existent-id' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
