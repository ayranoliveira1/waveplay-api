import { beforeEach, describe, expect, it } from 'vitest'

import { GetUserDetailUseCase } from './get-user-detail-use-case'
import { FakeAdminUserGateway } from 'test/ports/fake-admin-user-gateway'
import type { AdminUserDetail } from '../ports/admin-user-gateway.port'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'

let gateway: FakeAdminUserGateway
let sut: GetUserDetailUseCase

describe('GetUserDetailUseCase', () => {
  beforeEach(() => {
    gateway = new FakeAdminUserGateway()
    sut = new GetUserDetailUseCase(gateway)
  })

  it('should return user details with subscription and profiles', async () => {
    const detail: AdminUserDetail = {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@test.com',
      role: 'user',
      createdAt: new Date(),
      subscription: {
        id: 'sub-1',
        status: 'active',
        startedAt: new Date(),
        endsAt: null,
        plan: {
          id: 'plan-1',
          name: 'Padrão',
          slug: 'padrao',
          maxProfiles: 3,
          maxStreams: 2,
        },
      },
      profiles: [
        { id: 'p-1', name: 'Alice', isKid: false },
        { id: 'p-2', name: 'Kids', isKid: true },
      ],
    }
    gateway.details.set('user-1', detail)

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.id).toBe('user-1')
      expect(result.value.user.subscription?.plan.slug).toBe('padrao')
      expect(result.value.user.profiles).toHaveLength(2)
    }
  })

  it('should return UserNotFoundError when user does not exist', async () => {
    const result = await sut.execute({ userId: 'nonexistent' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })
})
