import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'

import { DeactivateUserUseCase } from './deactivate-user-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { InMemoryActiveStreamsRepository } from 'test/repositories/in-memory-active-streams-repository'
import { User, UserRole } from '@/modules/identity/domain/entities/user'
import { RefreshToken } from '@/modules/identity/domain/entities/refresh-token'
import { ActiveStream } from '@/modules/subscription/domain/entities/active-stream'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'
import { CannotDeactivateAdminError } from '../../domain/errors/cannot-deactivate-admin.error'

let usersRepository: InMemoryUsersRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository
let activeStreamsRepository: InMemoryActiveStreamsRepository
let sut: DeactivateUserUseCase

describe('DeactivateUserUseCase', () => {
  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository()
    refreshTokensRepository = new InMemoryRefreshTokensRepository()
    activeStreamsRepository = new InMemoryActiveStreamsRepository()
    sut = new DeactivateUserUseCase(
      usersRepository,
      refreshTokensRepository,
      activeStreamsRepository,
    )

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

  it('should deactivate an active user and touch updatedAt', async () => {
    const previousUpdatedAt = usersRepository.items[0].updatedAt

    await new Promise((resolve) => setTimeout(resolve, 5))

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.user.active).toBe(false)
      expect(result.value.user.updatedAt.getTime()).toBeGreaterThan(
        previousUpdatedAt.getTime(),
      )
    }
    expect(usersRepository.items[0].active).toBe(false)
  })

  it('should be idempotent when user is already inactive', async () => {
    usersRepository.items[0].deactivate()
    const previousUpdatedAt = usersRepository.items[0].updatedAt

    refreshTokensRepository.items.push(
      RefreshToken.createFromRawToken({
        rawToken: randomUUID(),
        userId: 'user-1',
        expiresInMs: 1000 * 60,
      }).refreshToken,
    )

    activeStreamsRepository.items.push(
      ActiveStream.create({
        userId: 'user-1',
        profileId: 'profile-1',
        tmdbId: 100,
        type: 'movie',
      }),
    )

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    expect(usersRepository.items[0].updatedAt.getTime()).toBe(
      previousUpdatedAt.getTime(),
    )
    expect(refreshTokensRepository.items[0].isRevoked()).toBe(false)
    expect(activeStreamsRepository.items).toHaveLength(1)
  })

  it('should return UserNotFoundError when userId does not exist', async () => {
    const result = await sut.execute({ userId: 'missing-id' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserNotFoundError)
  })

  it('should return CannotDeactivateAdminError when target is admin', async () => {
    await usersRepository.create(
      User.create(
        {
          name: 'Admin User',
          email: 'admin@email.com',
          passwordHash: 'hashed',
          role: UserRole.ADMIN,
        },
        new UniqueEntityID('admin-1'),
      ),
    )

    const result = await sut.execute({ userId: 'admin-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CannotDeactivateAdminError)
    expect(usersRepository.items[1].active).toBe(true)
  })

  it('should revoke all refresh tokens of the user', async () => {
    refreshTokensRepository.items.push(
      RefreshToken.createFromRawToken({
        rawToken: randomUUID(),
        userId: 'user-1',
        expiresInMs: 1000 * 60,
      }).refreshToken,
      RefreshToken.createFromRawToken({
        rawToken: randomUUID(),
        userId: 'user-1',
        expiresInMs: 1000 * 60,
      }).refreshToken,
      RefreshToken.createFromRawToken({
        rawToken: randomUUID(),
        userId: 'other-user',
        expiresInMs: 1000 * 60,
      }).refreshToken,
    )

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    const userTokens = refreshTokensRepository.items.filter(
      (t) => t.userId === 'user-1',
    )
    expect(userTokens.every((t) => t.isRevoked())).toBe(true)
    const otherTokens = refreshTokensRepository.items.filter(
      (t) => t.userId === 'other-user',
    )
    expect(otherTokens.every((t) => !t.isRevoked())).toBe(true)
  })

  it('should delete all active streams of the user', async () => {
    activeStreamsRepository.items.push(
      ActiveStream.create({
        userId: 'user-1',
        profileId: 'profile-1',
        tmdbId: 100,
        type: 'movie',
      }),
      ActiveStream.create({
        userId: 'user-1',
        profileId: 'profile-2',
        tmdbId: 200,
        type: 'tv',
      }),
      ActiveStream.create({
        userId: 'other-user',
        profileId: 'profile-3',
        tmdbId: 300,
        type: 'movie',
      }),
    )

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    expect(
      activeStreamsRepository.items.filter((s) => s.userId === 'user-1'),
    ).toHaveLength(0)
    expect(
      activeStreamsRepository.items.filter((s) => s.userId === 'other-user'),
    ).toHaveLength(1)
  })
})
