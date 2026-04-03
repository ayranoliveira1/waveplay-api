import { describe, it, expect, beforeEach } from 'vitest'

import { StartStreamUseCase } from './start-stream-use-case'
import { InMemoryActiveStreamsRepository } from 'test/repositories/in-memory-active-streams-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { FakeProfileOwnershipGateway } from 'test/ports/fake-profile-ownership-gateway'
import { Plan } from '../../domain/entities/plan'
import { Subscription } from '../../domain/entities/subscription'
import { ActiveStream } from '../../domain/entities/active-stream'
import { MaxStreamsReachedError } from '../../domain/errors/max-streams-reached.error'
import { StreamNotFoundError } from '../../domain/errors/stream-not-found.error'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let activeStreamsRepository: InMemoryActiveStreamsRepository
let subscriptionsRepository: InMemorySubscriptionsRepository
let plansRepository: InMemoryPlansRepository
let profileOwnershipGateway: FakeProfileOwnershipGateway
let sut: StartStreamUseCase

describe('StartStreamUseCase', () => {
  beforeEach(() => {
    activeStreamsRepository = new InMemoryActiveStreamsRepository()
    subscriptionsRepository = new InMemorySubscriptionsRepository()
    plansRepository = new InMemoryPlansRepository()
    profileOwnershipGateway = new FakeProfileOwnershipGateway()

    sut = new StartStreamUseCase(
      activeStreamsRepository,
      subscriptionsRepository,
      plansRepository,
      profileOwnershipGateway,
    )

    const plan = Plan.create(
      {
        name: 'Padrão',
        slug: 'padrao',
        priceCents: 1990,
        maxProfiles: 3,
        maxStreams: 2,
      },
      new UniqueEntityID('plan-1'),
    )

    plansRepository.items.push(plan)

    subscriptionsRepository.items.push(
      Subscription.create({
        userId: 'user-1',
        planId: 'plan-1',
      }),
    )
  })

  it('should start a stream successfully', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.streamId).toBeDefined()
    }
    expect(activeStreamsRepository.items).toHaveLength(1)
  })

  it('should return error when stream limit is reached', async () => {
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
        type: 'series',
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-3',
      tmdbId: 300,
      type: 'movie',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(MaxStreamsReachedError)
  })

  it('should not count expired streams towards the limit', async () => {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000)

    activeStreamsRepository.items.push(
      ActiveStream.create({
        userId: 'user-1',
        profileId: 'profile-1',
        tmdbId: 100,
        type: 'movie',
        lastPing: threeMinutesAgo,
      }),
      ActiveStream.create({
        userId: 'user-1',
        profileId: 'profile-2',
        tmdbId: 200,
        type: 'series',
        lastPing: threeMinutesAgo,
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-3',
      tmdbId: 300,
      type: 'movie',
    })

    expect(result.isRight()).toBe(true)
  })

  it('should upsert when same user+profile combination', async () => {
    activeStreamsRepository.items.push(
      ActiveStream.create({
        userId: 'user-1',
        profileId: 'profile-1',
        tmdbId: 100,
        type: 'movie',
      }),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      tmdbId: 200,
      type: 'series',
    })

    expect(result.isRight()).toBe(true)
    expect(activeStreamsRepository.items).toHaveLength(1)
    expect(activeStreamsRepository.items[0].tmdbId).toBe(200)
  })

  it('should return error when profile does not belong to user', async () => {
    profileOwnershipGateway.result = false

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-other',
      tmdbId: 550,
      type: 'movie',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(StreamNotFoundError)
  })

  it('should default to maxStreams=1 when no active subscription', async () => {
    subscriptionsRepository.items = []

    const result = await sut.execute({
      userId: 'user-2',
      profileId: 'profile-1',
      tmdbId: 550,
      type: 'movie',
    })

    expect(result.isRight()).toBe(true)

    // second stream should fail (maxStreams=1)
    const result2 = await sut.execute({
      userId: 'user-2',
      profileId: 'profile-2',
      tmdbId: 600,
      type: 'movie',
    })

    expect(result2.isLeft()).toBe(true)
    expect(result2.value).toBeInstanceOf(MaxStreamsReachedError)
  })
})
