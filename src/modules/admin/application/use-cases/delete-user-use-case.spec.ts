import { beforeEach, describe, expect, it } from 'vitest'

import { DeleteUserUseCase } from './delete-user-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { User, UserRole } from '@/modules/identity/domain/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'
import { CannotDeleteAdminError } from '../../domain/errors/cannot-delete-admin.error'
import { UserStillActiveError } from '../../domain/errors/user-still-active.error'

let usersRepository: InMemoryUsersRepository
let sut: DeleteUserUseCase

describe('DeleteUserUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    sut = new DeleteUserUseCase(usersRepository)

    const user = User.create(
      {
        name: 'João Silva',
        email: 'joao@email.com',
        passwordHash: 'hashed',
      },
      new UniqueEntityID('user-1'),
    )
    user.deactivate()
    await usersRepository.create(user)
  })

  it('should hard delete an inactive user', async () => {
    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.deleted).toBe(true)
    }
    expect(usersRepository.items).toHaveLength(0)
  })

  it('should return UserStillActiveError when user is still active', async () => {
    await usersRepository.create(
      User.create(
        {
          name: 'Active User',
          email: 'active@email.com',
          passwordHash: 'hashed',
        },
        new UniqueEntityID('user-2'),
      ),
    )

    const result = await sut.execute({ userId: 'user-2' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserStillActiveError)
    expect(usersRepository.items).toHaveLength(2)
  })

  it('should return UserNotFoundError when userId does not exist', async () => {
    const result = await sut.execute({ userId: 'missing-id' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('should return CannotDeleteAdminError when target is admin', async () => {
    const admin = User.create(
      {
        name: 'Admin User',
        email: 'admin@email.com',
        passwordHash: 'hashed',
        role: UserRole.ADMIN,
      },
      new UniqueEntityID('admin-1'),
    )
    admin.deactivate()
    await usersRepository.create(admin)

    const result = await sut.execute({ userId: 'admin-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CannotDeleteAdminError)
    expect(
      usersRepository.items.some((u) => u.id.toValue() === 'admin-1'),
    ).toBe(true)
  })
})
