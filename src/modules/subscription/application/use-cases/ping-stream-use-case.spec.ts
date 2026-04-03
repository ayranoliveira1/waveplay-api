import { describe, it, expect, beforeEach } from 'vitest'

import { PingStreamUseCase } from './ping-stream-use-case'
import { InMemoryActiveStreamsRepository } from 'test/repositories/in-memory-active-streams-repository'
import { ActiveStream } from '../../domain/entities/active-stream'
import { StreamNotFoundError } from '../../domain/errors/stream-not-found.error'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let activeStreamsRepository: InMemoryActiveStreamsRepository
let sut: PingStreamUseCase

describe('PingStreamUseCase', () => {
  beforeEach(() => {
    activeStreamsRepository = new InMemoryActiveStreamsRepository()
    sut = new PingStreamUseCase(activeStreamsRepository)
  })

  it('should update lastPing on valid stream', async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    activeStreamsRepository.items.push(
      ActiveStream.create(
        {
          userId: 'user-1',
          profileId: 'profile-1',
          tmdbId: 550,
          type: 'movie',
          lastPing: fiveMinutesAgo,
        },
        new UniqueEntityID('stream-1'),
      ),
    )

    const result = await sut.execute({
      userId: 'user-1',
      streamId: 'stream-1',
    })

    expect(result.isRight()).toBe(true)
    expect(activeStreamsRepository.items[0].lastPing.getTime()).toBeGreaterThan(
      fiveMinutesAgo.getTime(),
    )
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
