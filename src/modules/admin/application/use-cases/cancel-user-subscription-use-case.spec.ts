import { beforeEach, describe, expect, it } from 'vitest'

import { CancelUserSubscriptionUseCase } from './cancel-user-subscription-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { User } from '@/modules/identity/domain/entities/user'
import { Subscription } from '@/modules/subscription/domain/entities/subscription'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'
import { SubscriptionNotFoundError } from '../../domain/errors/subscription-not-found.error'

let usersRepository: InMemoryUsersRepository
let subscriptionsRepository: InMemorySubscriptionsRepository
let sut: CancelUserSubscriptionUseCase

describe('CancelUserSubscriptionUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    subscriptionsRepository = new InMemorySubscriptionsRepository()
    sut = new CancelUserSubscriptionUseCase(
      usersRepository,
      subscriptionsRepository,
    )

    await usersRepository.create(
      User.create(
        {
          name: 'João Silva',
          email: 'joao@email.com',
          passwordHash: 'hashed',
        },
        new UniqueEntityID('user-1'),
      ),
    )

    await subscriptionsRepository.create(
      Subscription.create(
        { userId: 'user-1', planId: 'plan-1' },
        new UniqueEntityID('sub-1'),
      ),
    )
  })

  it('should cancel active subscription successfully', async () => {
    const before = new Date()

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.subscription.status).toBe('canceled')
      expect(result.value.subscription.endsAt).toBeDefined()
      expect(
        result.value.subscription.endsAt!.getTime(),
      ).toBeGreaterThanOrEqual(before.getTime())
    }

    expect(subscriptionsRepository.items[0].status).toBe('canceled')
  })

  it('should return SubscriptionNotFoundError when user has no active subscription', async () => {
    subscriptionsRepository.items[0].cancel()
    await subscriptionsRepository.save(subscriptionsRepository.items[0])

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SubscriptionNotFoundError)
  })

  it('should return UserNotFoundError when user does not exist', async () => {
    const result = await sut.execute({ userId: 'missing-id' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('should not affect other subscriptions of the same user', async () => {
    await subscriptionsRepository.create(
      Subscription.create(
        {
          userId: 'user-1',
          planId: 'plan-old',
          status: 'canceled',
          endsAt: new Date('2024-01-01'),
        },
        new UniqueEntityID('sub-old'),
      ),
    )

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    expect(subscriptionsRepository.items).toHaveLength(2)

    const oldSub = subscriptionsRepository.items.find(
      (s) => s.id.toValue() === 'sub-old',
    )!
    expect(oldSub.status).toBe('canceled')
    expect(oldSub.endsAt!.getTime()).toBe(new Date('2024-01-01').getTime())
  })
})
