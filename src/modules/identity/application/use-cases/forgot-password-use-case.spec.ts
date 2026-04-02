import { describe, it, expect, beforeEach } from 'vitest'

import { ForgotPasswordUseCase } from './forgot-password-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryPasswordResetTokensRepository } from 'test/repositories/in-memory-password-reset-tokens-repository'
import { User } from '../../domain/entities/user'

let usersRepository: InMemoryUsersRepository
let passwordResetTokensRepository: InMemoryPasswordResetTokensRepository
let sut: ForgotPasswordUseCase

describe('ForgotPasswordUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    passwordResetTokensRepository =
      new InMemoryPasswordResetTokensRepository()

    sut = new ForgotPasswordUseCase(
      usersRepository,
      passwordResetTokensRepository,
    )

    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: 'Abc12345-hashed',
      planId: 'plan-basico-id',
    })

    await usersRepository.create(user)
  })

  it('should return success even when email does not exist', async () => {
    const result = await sut.execute({ email: 'inexistente@email.com' })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.message).toBe(
        'Se o email existir, um link de recuperação foi enviado',
      )
    }

    // Não deve criar token para email inexistente
    expect(passwordResetTokensRepository.items).toHaveLength(0)
  })

  it('should create token with SHA-256 hash', async () => {
    await sut.execute({ email: 'joao@email.com' })

    expect(passwordResetTokensRepository.items).toHaveLength(1)

    const storedToken = passwordResetTokensRepository.items[0]

    // SHA-256 hex = 64 caracteres
    expect(storedToken.tokenHash).toHaveLength(64)
    expect(storedToken.userId).toBe(usersRepository.items[0].id.toValue())
    expect(storedToken.usedAt).toBeNull()
  })

  it('should set token expiration to 15 minutes', async () => {
    const before = Date.now()

    await sut.execute({ email: 'joao@email.com' })

    const after = Date.now()
    const storedToken = passwordResetTokensRepository.items[0]
    const fifteenMinMs = 15 * 60 * 1000

    expect(storedToken.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + fifteenMinMs,
    )
    expect(storedToken.expiresAt.getTime()).toBeLessThanOrEqual(
      after + fifteenMinMs,
    )
  })
})
