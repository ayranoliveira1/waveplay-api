import { describe, it, expect, beforeEach } from 'vitest'
import { createHash, randomBytes } from 'node:crypto'

import { ResetPasswordUseCase } from './reset-password-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryPasswordResetTokensRepository } from 'test/repositories/in-memory-password-reset-tokens-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { User } from '../../domain/entities/user'
import { RefreshToken } from '../../domain/entities/refresh-token'
import { PasswordResetToken } from '../../domain/entities/password-reset-token'
import { InvalidResetTokenError } from '../../domain/errors/invalid-reset-token.error'

let usersRepository: InMemoryUsersRepository
let passwordResetTokensRepository: InMemoryPasswordResetTokensRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository
let hasher: FakeHasher
let sut: ResetPasswordUseCase

let user: User
let rawToken: string

describe('ResetPasswordUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    passwordResetTokensRepository = new InMemoryPasswordResetTokensRepository()
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    hasher = new FakeHasher()

    sut = new ResetPasswordUseCase(
      passwordResetTokensRepository,
      usersRepository,
      hasher,
      refreshTokensRepository,
    )

    user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: 'Abc12345-hashed',
    })

    await usersRepository.create(user)

    // Cria token de reset válido via factory da entidade
    rawToken = randomBytes(32).toString('hex')

    const { passwordResetToken } = PasswordResetToken.createFromRawToken({
      rawToken,
      userId: user.id.toValue(),
      expiresInMs: 15 * 60 * 1000,
    })

    await passwordResetTokensRepository.create(passwordResetToken)
  })

  it('should reset password successfully', async () => {
    const result = await sut.execute({
      token: rawToken,
      newPassword: 'NovaSenha123',
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.message).toBe('Senha alterada com sucesso')
    }
  })

  it('should update user password with hash', async () => {
    await sut.execute({
      token: rawToken,
      newPassword: 'NovaSenha123',
    })

    const updatedUser = await usersRepository.findById(user.id.toValue())

    expect(updatedUser?.passwordHash).toBe('NovaSenha123-hashed')
  })

  it('should mark token as used', async () => {
    await sut.execute({
      token: rawToken,
      newPassword: 'NovaSenha123',
    })

    const storedToken = passwordResetTokensRepository.items[0]

    expect(storedToken.isUsed()).toBe(true)
  })

  it('should revoke all refresh token families', async () => {
    const rt1 = RefreshToken.create({
      userId: user.id.toValue(),
      tokenHash: 'hash-1',
      family: 'family-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ipAddress: null,
      userAgent: null,
    })

    const rt2 = RefreshToken.create({
      userId: user.id.toValue(),
      tokenHash: 'hash-2',
      family: 'family-2',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ipAddress: null,
      userAgent: null,
    })

    await refreshTokensRepository.create(rt1)
    await refreshTokensRepository.create(rt2)

    await sut.execute({
      token: rawToken,
      newPassword: 'NovaSenha123',
    })

    expect(rt1.isRevoked()).toBe(true)
    expect(rt2.isRevoked()).toBe(true)
  })

  it('should return error when token does not exist', async () => {
    const result = await sut.execute({
      token: 'token-inexistente',
      newPassword: 'NovaSenha123',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidResetTokenError)
  })

  it('should return error when token is expired', async () => {
    const expiredRawToken = randomBytes(32).toString('hex')
    const expiredHash = createHash('sha256')
      .update(expiredRawToken)
      .digest('hex')

    const expiredToken = PasswordResetToken.create({
      userId: user.id.toValue(),
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 1000),
    })

    await passwordResetTokensRepository.create(expiredToken)

    const result = await sut.execute({
      token: expiredRawToken,
      newPassword: 'NovaSenha123',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidResetTokenError)
  })

  it('should return error when token is already used', async () => {
    const usedRawToken = randomBytes(32).toString('hex')
    const usedHash = createHash('sha256').update(usedRawToken).digest('hex')

    const usedToken = PasswordResetToken.create({
      userId: user.id.toValue(),
      tokenHash: usedHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      usedAt: new Date(),
    })

    await passwordResetTokensRepository.create(usedToken)

    const result = await sut.execute({
      token: usedRawToken,
      newPassword: 'NovaSenha123',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidResetTokenError)
  })
})
