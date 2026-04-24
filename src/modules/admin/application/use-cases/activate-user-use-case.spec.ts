import { beforeEach, describe, expect, it } from 'vitest'

import { ActivateUserUseCase } from './activate-user-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { User } from '@/modules/identity/domain/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'

let usersRepository: InMemoryUsersRepository
let sut: ActivateUserUseCase

describe('ActivateUserUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    sut = new ActivateUserUseCase(usersRepository)

    await usersRepository.create(
      User.create(
        {
          name: 'João Silva',
          email: 'joao@email.com',
          passwordHash: 'hashed',
          active: false,
        },
        new UniqueEntityID('user-1'),
      ),
    )
  })

  it('should activate an inactive user and touch updatedAt', async () => {
    const previousUpdatedAt = usersRepository.items[0].updatedAt

    await new Promise((resolve) => setTimeout(resolve, 5))

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.active).toBe(true)
      expect(result.value.user.updatedAt.getTime()).toBeGreaterThan(
        previousUpdatedAt.getTime(),
      )
    }
    expect(usersRepository.items[0].active).toBe(true)
  })

  it('should be idempotent when user is already active', async () => {
    usersRepository.items[0].activate()
    const previousUpdatedAt = usersRepository.items[0].updatedAt

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    expect(usersRepository.items[0].active).toBe(true)
    expect(usersRepository.items[0].updatedAt.getTime()).toBe(
      previousUpdatedAt.getTime(),
    )
  })

  it('should return UserNotFoundError when userId does not exist', async () => {
    const result = await sut.execute({ userId: 'missing-id' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })
})
