import { describe, it, expect, beforeEach } from 'vitest'

import { LogoutUseCase } from './logout-use-case'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { RefreshToken } from '../../domain/entities/refresh-token'

let refreshTokensRepository: InMemoryRefreshTokensRepository
let sut: LogoutUseCase

describe('LogoutUseCase', () => {
  beforeEach(() => {
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    sut = new LogoutUseCase(refreshTokensRepository)
  })

  it('should revoke all tokens from the same family', async () => {
    // 2 tokens da mesma family (rotação normal)
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
      family: 'family-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ipAddress: null,
      userAgent: null,
    })

    // Token de outra family (não deve ser afetado)
    const tokenOtherFamily = RefreshToken.create({
      userId: 'user-1',
      tokenHash: 'hash-3',
      family: 'family-2',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ipAddress: null,
      userAgent: null,
    })

    await refreshTokensRepository.create(token1)
    await refreshTokensRepository.create(token2)
    await refreshTokensRepository.create(tokenOtherFamily)

    const result = await sut.execute({ family: 'family-1' })

    expect(result.isRight()).toBe(true)

    // Tokens da family-1 revogados
    expect(token1.isRevoked()).toBe(true)
    expect(token2.isRevoked()).toBe(true)

    // Token da family-2 intacto
    expect(tokenOtherFamily.isRevoked()).toBe(false)
  })
})
