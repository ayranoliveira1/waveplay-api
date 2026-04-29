import { describe, it, expect, beforeEach } from 'vitest'

import { ChangePasswordUseCase } from './change-password-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { User } from '../../domain/entities/user'
import { RefreshToken } from '../../domain/entities/refresh-token'
import { WeakPasswordError } from '../../domain/errors/weak-password.error'
import { InvalidCurrentPasswordError } from '../../domain/errors/invalid-current-password.error'
import { SamePasswordError } from '../../domain/errors/same-password.error'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'

let usersRepository: InMemoryUsersRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository
let hasher: FakeHasher
let sut: ChangePasswordUseCase

let user: User

const CURRENT_PASSWORD = 'Atual1234'
const NEW_PASSWORD = 'NovaSenha123'

describe('ChangePasswordUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    hasher = new FakeHasher()

    sut = new ChangePasswordUseCase(
      usersRepository,
      hasher,
      refreshTokensRepository,
    )

    // FakeHasher armazena no formato `${plain}-hashed`
    user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: `${CURRENT_PASSWORD}-hashed`,
    })

    await usersRepository.create(user)
  })

  it('should change password successfully when data is valid', async () => {
    const result = await sut.execute({
      userId: user.id.toValue(),
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.message).toBe('Senha alterada com sucesso')
    }
  })

  it('should persist new password as hash, never as plain text', async () => {
    await sut.execute({
      userId: user.id.toValue(),
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    })

    const updated = await usersRepository.findById(user.id.toValue())

    expect(updated?.passwordHash).toBe(`${NEW_PASSWORD}-hashed`)
    expect(updated?.passwordHash).not.toBe(NEW_PASSWORD)
    expect(updated?.passwordHash).not.toBe(`${CURRENT_PASSWORD}-hashed`)
  })

  it('should revoke all refresh token families of the user', async () => {
    const rt1 = RefreshToken.create({
      userId: user.id.toValue(),
      tokenHash: 'hash-1',
      family: 'family-1',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ipAddress: null,
      userAgent: null,
    })

    const rt2 = RefreshToken.create({
      userId: user.id.toValue(),
      tokenHash: 'hash-2',
      family: 'family-2',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ipAddress: null,
      userAgent: null,
    })

    await refreshTokensRepository.create(rt1)
    await refreshTokensRepository.create(rt2)

    await sut.execute({
      userId: user.id.toValue(),
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    })

    expect(rt1.isRevoked()).toBe(true)
    expect(rt2.isRevoked()).toBe(true)
  })

  it('should return UserNotFoundError when userId does not exist', async () => {
    const result = await sut.execute({
      userId: 'non-existent-user-id',
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('should return InvalidCurrentPasswordError when currentPassword does not match', async () => {
    const result = await sut.execute({
      userId: user.id.toValue(),
      currentPassword: 'WrongPass1',
      newPassword: NEW_PASSWORD,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCurrentPasswordError)
  })

  it('should return WeakPasswordError when newPassword does not meet policy', async () => {
    const cases = ['short1A', 'nouppercase1', 'NOLOWERCASE1', 'NoDigitsHere']

    for (const weak of cases) {
      const result = await sut.execute({
        userId: user.id.toValue(),
        currentPassword: CURRENT_PASSWORD,
        newPassword: weak,
      })

      expect(result.isLeft()).toBe(true)
      expect(result.value).toBeInstanceOf(WeakPasswordError)
    }
  })

  it('should return SamePasswordError when newPassword equals currentPassword', async () => {
    const result = await sut.execute({
      userId: user.id.toValue(),
      currentPassword: CURRENT_PASSWORD,
      newPassword: CURRENT_PASSWORD,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SamePasswordError)
  })

  it('should leave the user state unchanged when an error occurs', async () => {
    const originalHash = user.passwordHash

    await sut.execute({
      userId: user.id.toValue(),
      currentPassword: 'WrongPass1',
      newPassword: NEW_PASSWORD,
    })

    const after = await usersRepository.findById(user.id.toValue())

    expect(after?.passwordHash).toBe(originalHash)
  })
})
