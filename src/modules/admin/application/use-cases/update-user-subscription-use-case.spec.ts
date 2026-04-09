import { beforeEach, describe, expect, it } from 'vitest'

import { UpdateUserSubscriptionUseCase } from './update-user-subscription-use-case'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { FakeAdminUserGateway } from 'test/ports/fake-admin-user-gateway'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { Subscription } from '@/modules/subscription/domain/entities/subscription'
import { Profile } from '@/modules/profile/domain/entities/profile'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'
import type { AdminUserDetail } from '../ports/admin-user-gateway.port'

let plansRepository: InMemoryPlansRepository
let subscriptionsRepository: InMemorySubscriptionsRepository
let profilesRepository: InMemoryProfilesRepository
let gateway: FakeAdminUserGateway
let sut: UpdateUserSubscriptionUseCase

function seedUserInGateway(userId: string) {
  const detail: AdminUserDetail = {
    id: userId,
    name: 'Test User',
    email: 'test@test.com',
    role: 'user',
    createdAt: new Date(),
    subscription: null,
    profiles: [],
  }
  gateway.details.set(userId, detail)
}

describe('UpdateUserSubscriptionUseCase', () => {
  beforeEach(() => {
    plansRepository = new InMemoryPlansRepository()
    subscriptionsRepository = new InMemorySubscriptionsRepository()
    profilesRepository = new InMemoryProfilesRepository()
    gateway = new FakeAdminUserGateway()

    sut = new UpdateUserSubscriptionUseCase(
      subscriptionsRepository,
      plansRepository,
      profilesRepository,
      gateway,
    )

    plansRepository.items.push(
      Plan.create(
        {
          name: 'Básico',
          slug: 'basico',
          priceCents: 0,
          maxProfiles: 1,
          maxStreams: 1,
        },
        new UniqueEntityID('plan-basico'),
      ),
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

  it('should update existing active subscription to the new plan', async () => {
    seedUserInGateway('user-1')
    subscriptionsRepository.items.push(
      Subscription.create({ userId: 'user-1', planId: 'plan-basico' }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      planId: 'plan-premium',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.subscription.planId).toBe('plan-premium')
      expect(result.value.warning).toBeNull()
    }
    expect(subscriptionsRepository.items).toHaveLength(1)
    expect(subscriptionsRepository.items[0].planId).toBe('plan-premium')
  })

  it('should create a new subscription when user has no active one', async () => {
    seedUserInGateway('user-1')

    const result = await sut.execute({
      userId: 'user-1',
      planId: 'plan-padrao',
    })

    expect(result.isRight()).toBe(true)
    expect(subscriptionsRepository.items).toHaveLength(1)
    expect(subscriptionsRepository.items[0].userId).toBe('user-1')
    expect(subscriptionsRepository.items[0].planId).toBe('plan-padrao')
  })

  it('should return warning when downgrading and user has more profiles than new plan allows', async () => {
    seedUserInGateway('user-1')
    subscriptionsRepository.items.push(
      Subscription.create({ userId: 'user-1', planId: 'plan-premium' }),
    )
    // Seed 3 profiles directly, bypassing maxProfiles check
    profilesRepository.items.push(
      Profile.create({ userId: 'user-1', name: 'P1' }),
      Profile.create({ userId: 'user-1', name: 'P2' }),
      Profile.create({ userId: 'user-1', name: 'P3' }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      planId: 'plan-basico', // maxProfiles: 1
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.warning).toContain('3 perfis')
      expect(result.value.warning).toContain('apenas 1')
    }
    // Profiles are NOT deleted (business rule)
    expect(profilesRepository.items).toHaveLength(3)
  })

  it('should return null warning when new plan allows equal or more profiles', async () => {
    seedUserInGateway('user-1')
    subscriptionsRepository.items.push(
      Subscription.create({ userId: 'user-1', planId: 'plan-basico' }),
    )
    profilesRepository.items.push(
      Profile.create({ userId: 'user-1', name: 'P1' }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      planId: 'plan-padrao', // maxProfiles: 3
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.warning).toBeNull()
    }
  })

  it('should return UserNotFoundError when user does not exist', async () => {
    const result = await sut.execute({
      userId: 'nonexistent',
      planId: 'plan-padrao',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('should return PlanNotFoundError when plan does not exist', async () => {
    seedUserInGateway('user-1')

    const result = await sut.execute({
      userId: 'user-1',
      planId: 'nonexistent-plan',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PlanNotFoundError)
  })
})
