import { describe, it, expect, beforeEach } from 'vitest'

import { CleanupExpiredStreamsUseCase } from './cleanup-expired-streams-use-case'
import { InMemoryActiveStreamsRepository } from 'test/repositories/in-memory-active-streams-repository'
import { FakeStreamCache } from 'test/cache/fake-stream-cache'
import { ActiveStream } from '../../domain/entities/active-stream'

let activeStreamsRepository: InMemoryActiveStreamsRepository
let streamCache: FakeStreamCache
let sut: CleanupExpiredStreamsUseCase

describe('CleanupExpiredStreamsUseCase', () => {
  beforeEach(() => {
    activeStreamsRepository = new InMemoryActiveStreamsRepository()
    streamCache = new FakeStreamCache()
    sut = new CleanupExpiredStreamsUseCase(activeStreamsRepository, streamCache)
  })

  it('should delete expired streams from repository and cache', async () => {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000)
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000)

    activeStreamsRepository.items.push(
      ActiveStream.create({
        userId: 'user-1',
        profileId: 'profile-1',
        tmdbId: 100,
        type: 'movie',
        lastPing: threeMinutesAgo,
      }),
      ActiveStream.create({
        userId: 'user-2',
        profileId: 'profile-2',
        tmdbId: 200,
        type: 'series',
        lastPing: threeMinutesAgo,
      }),
      ActiveStream.create({
        userId: 'user-3',
        profileId: 'profile-3',
        tmdbId: 300,
        type: 'movie',
        lastPing: oneMinuteAgo,
      }),
    )

    streamCache.streams.set('stream-expired-1', {
      userId: 'user-1',
      profileId: 'profile-1',
      profileName: 'João',
      streamId: 'stream-expired-1',
      tmdbId: 100,
      type: 'movie',
      title: 'The Matrix',
      startedAt: threeMinutesAgo,
      lastPing: threeMinutesAgo.getTime(),
    })

    streamCache.streams.set('stream-active-1', {
      userId: 'user-3',
      profileId: 'profile-3',
      profileName: 'Ana',
      streamId: 'stream-active-1',
      tmdbId: 300,
      type: 'movie',
      title: 'Inception',
      startedAt: oneMinuteAgo,
      lastPing: oneMinuteAgo.getTime(),
    })

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.deletedCount).toBe(2)
    expect(activeStreamsRepository.items).toHaveLength(1)
    expect(streamCache.streams.size).toBe(1)
    expect(streamCache.streams.has('stream-active-1')).toBe(true)
  })

  it('should return 0 when no expired streams', async () => {
    activeStreamsRepository.items.push(
      ActiveStream.create({
        userId: 'user-1',
        profileId: 'profile-1',
        tmdbId: 100,
        type: 'movie',
      }),
    )

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.deletedCount).toBe(0)
    expect(activeStreamsRepository.items).toHaveLength(1)
  })

  it('should not delete active streams', async () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000)

    activeStreamsRepository.items.push(
      ActiveStream.create({
        userId: 'user-1',
        profileId: 'profile-1',
        tmdbId: 100,
        type: 'movie',
        lastPing: thirtySecondsAgo,
      }),
    )

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    expect(result.value.deletedCount).toBe(0)
    expect(activeStreamsRepository.items).toHaveLength(1)
  })
})
