import { describe, it, expect, beforeEach } from 'vitest'

import { StopStreamUseCase } from './stop-stream-use-case'
import { InMemoryActiveStreamsRepository } from 'test/repositories/in-memory-active-streams-repository'
import { FakeStreamCache } from 'test/cache/fake-stream-cache'
import { ActiveStream } from '../../domain/entities/active-stream'
import { StreamNotFoundError } from '../../domain/errors/stream-not-found.error'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let activeStreamsRepository: InMemoryActiveStreamsRepository
let streamCache: FakeStreamCache
let sut: StopStreamUseCase

describe('StopStreamUseCase', () => {
  beforeEach(() => {
    activeStreamsRepository = new InMemoryActiveStreamsRepository()
    streamCache = new FakeStreamCache()
    sut = new StopStreamUseCase(activeStreamsRepository, streamCache)
  })

  it('should delete the stream from repository and cache', async () => {
    activeStreamsRepository.items.push(
      ActiveStream.create(
        {
          userId: 'user-1',
          profileId: 'profile-1',
          tmdbId: 550,
          type: 'movie',
        },
        new UniqueEntityID('stream-1'),
      ),
    )

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
      userId: 'user-1',
      streamId: 'stream-1',
    })

    expect(result.isRight()).toBe(true)
    expect(activeStreamsRepository.items).toHaveLength(0)
    expect(streamCache.streams.size).toBe(0)
  })

  it('should return error when stream not found', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      streamId: 'non-existent',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(StreamNotFoundError)
  })

  it('should return error when stream belongs to another user', async () => {
    activeStreamsRepository.items.push(
      ActiveStream.create(
        {
          userId: 'user-1',
          profileId: 'profile-1',
          tmdbId: 550,
          type: 'movie',
        },
        new UniqueEntityID('stream-1'),
      ),
    )

    const result = await sut.execute({
      userId: 'user-2',
      streamId: 'stream-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(StreamNotFoundError)
  })
})
