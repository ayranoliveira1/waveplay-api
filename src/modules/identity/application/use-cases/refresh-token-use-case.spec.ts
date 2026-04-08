import { describe, it, expect, beforeEach } from 'vitest'
import { createHash, randomUUID } from 'node:crypto'

import { RefreshTokenUseCase } from './refresh-token-use-case'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakeAuthConfig } from 'test/ports/fake-auth-config'
import { RefreshToken } from '../../domain/entities/refresh-token'
import { User } from '../../domain/entities/user'
import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error'
import { TokenTheftDetectedError } from '../../domain/errors/token-theft-detected.error'

let refreshTokensRepository: InMemoryRefreshTokensRepository
let usersRepository: InMemoryUsersRepository
let encrypter: FakeEncrypter
let authConfig: FakeAuthConfig
let sut: RefreshTokenUseCase

describe('RefreshTokenUseCase', () => {
  beforeEach(async () => {
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    usersRepository = new InMemoryUsersRepository()
    encrypter = new FakeEncrypter()
    authConfig = new FakeAuthConfig()

    const user = User.create(
      {
        name: 'João Silva',
        email: 'joao@email.com',
        passwordHash: '12345678-hashed',
      },
      new (await import('@/core/entities/unique-entity-id')).UniqueEntityID(
        'user-1',
      ),
    )

    await usersRepository.create(user)

    sut = new RefreshTokenUseCase(
      refreshTokensRepository,
      usersRepository,
      encrypter,
      authConfig,
    )
  })

  it('should refresh token successfully with same family', async () => {
    const rawToken = randomUUID()
    const { refreshToken } = RefreshToken.createFromRawToken({
      rawToken,
      userId: 'user-1',
      expiresInMs: authConfig.getRefreshTokenExpiresInMs(),
      family: 'family-1',
    })

    await refreshTokensRepository.create(refreshToken)

    const result = await sut.execute({ refreshToken: rawToken })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.accessToken).toBeDefined()
      expect(result.value.refreshToken).toBeDefined()
      expect(result.value.refreshToken).not.toBe(rawToken)
    }

    // Token antigo revogado + novo token criado
    expect(refreshTokensRepository.items).toHaveLength(2)
    expect(refreshTokensRepository.items[0].isRevoked()).toBe(true)

    // Novo token herda a mesma family
    expect(refreshTokensRepository.items[1].family).toBe('family-1')
  })

  it('should include user role in new access token', async () => {
    const rawToken = randomUUID()
    const { refreshToken } = RefreshToken.createFromRawToken({
      rawToken,
      userId: 'user-1',
      expiresInMs: authConfig.getRefreshTokenExpiresInMs(),
      family: 'family-role',
    })

    await refreshTokensRepository.create(refreshToken)

    const result = await sut.execute({ refreshToken: rawToken })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      const decoded = await encrypter.verify(result.value.accessToken)
      expect(decoded).toHaveProperty('role', 'user')
    }
  })

  it('should revoke old token after refresh', async () => {
    const rawToken = randomUUID()
    const { refreshToken } = RefreshToken.createFromRawToken({
      rawToken,
      userId: 'user-1',
      expiresInMs: authConfig.getRefreshTokenExpiresInMs(),
    })

    await refreshTokensRepository.create(refreshToken)

    await sut.execute({ refreshToken: rawToken })

    expect(refreshTokensRepository.items[0].isRevoked()).toBe(true)
  })

  it('should return error when token does not exist', async () => {
    const result = await sut.execute({ refreshToken: 'token-inexistente' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
  })

  it('should return error when token is expired', async () => {
    const rawToken = randomUUID()
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    const expiredToken = RefreshToken.create({
      userId: 'user-1',
      tokenHash,
      family: 'family-1',
      expiresAt: new Date(Date.now() - 1000), // expirado
      ipAddress: null,
      userAgent: null,
    })

    await refreshTokensRepository.create(expiredToken)

    const result = await sut.execute({ refreshToken: rawToken })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
  })

  it('should detect token theft and revoke entire family', async () => {
    const rawToken = randomUUID()
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    // Token já revogado (simula roubo — alguém já usou este token)
    const revokedToken = RefreshToken.create({
      userId: 'user-1',
      tokenHash,
      family: 'family-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: new Date(), // já revogado
      ipAddress: null,
      userAgent: null,
    })

    // Outro token válido da mesma family
    const validToken = RefreshToken.create({
      userId: 'user-1',
      tokenHash: 'other-hash',
      family: 'family-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ipAddress: null,
      userAgent: null,
    })

    await refreshTokensRepository.create(revokedToken)
    await refreshTokensRepository.create(validToken)

    const result = await sut.execute({ refreshToken: rawToken })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(TokenTheftDetectedError)

    // Todos os tokens da family devem estar revogados
    const allRevoked = refreshTokensRepository.items
      .filter((t) => t.family === 'family-1')
      .every((t) => t.isRevoked())

    expect(allRevoked).toBe(true)
  })
})
