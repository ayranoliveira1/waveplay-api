import { beforeEach, describe, expect, it } from 'vitest'

import { AdminUpdateUserUseCase } from './admin-update-user-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { User } from '@/modules/identity/domain/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { EmailAlreadyExistsError } from '@/modules/identity/domain/errors/email-already-exists.error'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'

let usersRepository: InMemoryUsersRepository
let sut: AdminUpdateUserUseCase

describe('AdminUpdateUserUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    sut = new AdminUpdateUserUseCase(usersRepository)

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
  })

  it('should update only the name and touch updatedAt', async () => {
    const previousUpdatedAt = usersRepository.items[0].updatedAt

    await new Promise((resolve) => setTimeout(resolve, 5))

    const result = await sut.execute({
      userId: 'user-1',
      name: 'João Santos',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.name).toBe('João Santos')
      expect(result.value.user.email).toBe('joao@email.com')
      expect(result.value.user.updatedAt.getTime()).toBeGreaterThan(
        previousUpdatedAt.getTime(),
      )
    }
  })

  it('should update only the email', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      email: 'novo@email.com',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.email).toBe('novo@email.com')
      expect(result.value.user.name).toBe('João Silva')
    }
  })

  it('should update both name and email simultaneously', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      name: 'João Santos',
      email: 'novo@email.com',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.name).toBe('João Santos')
      expect(result.value.user.email).toBe('novo@email.com')
    }
  })

  it('should return UserNotFoundError when userId does not exist', async () => {
    const result = await sut.execute({
      userId: 'missing-id',
      name: 'Qualquer',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('should return EmailAlreadyExistsError when email belongs to another user', async () => {
    await usersRepository.create(
      User.create(
        {
          name: 'Maria',
          email: 'maria@email.com',
          passwordHash: 'hashed',
        },
        new UniqueEntityID('user-2'),
      ),
    )

    const result = await sut.execute({
      userId: 'user-1',
      email: 'maria@email.com',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(EmailAlreadyExistsError)
  })

  it('should be a no-op conflict when email matches the user own email', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      email: 'joao@email.com',
      name: 'João Atualizado',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.email).toBe('joao@email.com')
      expect(result.value.user.name).toBe('João Atualizado')
    }
  })
})
