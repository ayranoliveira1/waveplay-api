import { describe, it, expect, beforeEach } from 'vitest'

import { PingStreamUseCase } from './ping-stream-use-case'
import { FakeStreamCache } from 'test/cache/fake-stream-cache'
import { StreamNotFoundError } from '../../domain/errors/stream-not-found.error'

let streamCache: FakeStreamCache
let sut: PingStreamUseCase

describe('PingStreamUseCase', () => {
  beforeEach(() => {
    streamCache = new FakeStreamCache()
    sut = new PingStreamUseCase(streamCache)
  })

  it('should update lastPing on valid stream via cache', async () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

    streamCache.streams.set('stream-1', {
      userId: 'user-1',
      profileId: 'profile-1',
      profileName: 'João',
      streamId: 'stream-1',
      tmdbId: 550,
      type: 'movie',
      title: 'Fight Club',
      startedAt: new Date(),
      lastPing: fiveMinutesAgo,
    })

    const result = await sut.execute({
      userId: 'user-1',
      streamId: 'stream-1',
    })

    expect(result.isRight()).toBe(true)

    const cached = streamCache.streams.get('stream-1')
    expect(cached!.lastPing).toBeGreaterThan(fiveMinutesAgo)
  })

  it('should return error when stream not found in cache', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      streamId: 'non-existent',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(StreamNotFoundError)
  })

  it('should return error when stream belongs to another user', async () => {
    streamCache.streams.set('stream-1', {
      userId: 'user-1',
      profileId: 'profile-1',
      profileName: 'João',
      streamId: 'stream-1',
      tmdbId: 550,
      type: 'movie',
      title: 'Fight Club',
      startedAt: new Date(),
      lastPing: Date.now(),
    })

    const result = await sut.execute({
      userId: 'user-2',
      streamId: 'stream-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(StreamNotFoundError)
  })
})
