import { describe, it, expect, beforeEach } from 'vitest'

import { LogoutAllUseCase } from './logout-all-use-case'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { RefreshToken } from '../../domain/entities/refresh-token'

let refreshTokensRepository: InMemoryRefreshTokensRepository
let sut: LogoutAllUseCase

describe('LogoutAllUseCase', () => {
  beforeEach(() => {
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    sut = new LogoutAllUseCase(refreshTokensRepository)
  })

  it('should revoke all tokens from all families of the user', async () => {
    // Tokens de 2 families diferentes (2 dispositivos)
    const token1 = RefreshToken.create({
      userId: 'user-1',
      tokenHash: 'hash-1',
      family: 'family-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ipAddress: null,
      userAgent: null,
    })

    const token2 = RefreshToken.create({
      userId: 'user-1',
      tokenHash: 'hash-2',
      family: 'family-2',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ipAddress: null,
      userAgent: null,
    })

    // Token de outro usuário (não deve ser afetado)
    const tokenOtherUser = RefreshToken.create({
      userId: 'user-2',
      tokenHash: 'hash-3',
      family: 'family-3',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ipAddress: null,
      userAgent: null,
    })

    await refreshTokensRepository.create(token1)
    await refreshTokensRepository.create(token2)
    await refreshTokensRepository.create(tokenOtherUser)

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)

    // Todos os tokens do user-1 revogados
    expect(token1.isRevoked()).toBe(true)
    expect(token2.isRevoked()).toBe(true)

    // Token do user-2 intacto
    expect(tokenOtherUser.isRevoked()).toBe(false)
  })
})
