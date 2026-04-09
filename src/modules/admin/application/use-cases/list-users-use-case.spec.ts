import { beforeEach, describe, expect, it } from 'vitest'

import { ListUsersUseCase } from './list-users-use-case'
import { FakeAdminUserGateway } from 'test/ports/fake-admin-user-gateway'
import type { AdminUserListItem } from '../ports/admin-user-gateway.port'

let gateway: FakeAdminUserGateway
let sut: ListUsersUseCase

describe('ListUsersUseCase', () => {
  beforeEach(() => {
    gateway = new FakeAdminUserGateway()
    sut = new ListUsersUseCase(gateway)
  })

  it('should return a paginated list of users', async () => {
    const makeUser = (id: string, name: string): AdminUserListItem => ({
      id,
      name,
      email: `${name.toLowerCase()}@test.com`,
      role: 'user',
      subscription: null,
      profilesCount: 1,
      createdAt: new Date(),
    })

    gateway.users = [
      makeUser('1', 'Alice'),
      makeUser('2', 'Bob'),
      makeUser('3', 'Carol'),
    ]

    const result = await sut.execute({ page: 1, perPage: 20 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users).toHaveLength(3)
      expect(result.value.totalItems).toBe(3)
      expect(result.value.totalPages).toBe(1)
      expect(result.value.page).toBe(1)
    }
    expect(gateway.lastListCall).toEqual({
      page: 1,
      perPage: 20,
      search: undefined,
    })
  })

  it('should return an empty list when there are no users', async () => {
    const result = await sut.execute({ page: 1, perPage: 20 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.users).toHaveLength(0)
      expect(result.value.totalItems).toBe(0)
      expect(result.value.totalPages).toBe(1)
    }
  })
})
