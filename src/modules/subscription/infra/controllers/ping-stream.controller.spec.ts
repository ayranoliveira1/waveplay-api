import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { PingStreamController } from './ping-stream.controller'
import { PingStreamUseCase } from '../../application/use-cases/ping-stream-use-case'
import { ActiveStreamsRepository } from '../../domain/repositories/active-streams-repository'
import { InMemoryActiveStreamsRepository } from 'test/repositories/in-memory-active-streams-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { ActiveStream } from '../../domain/entities/active-stream'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let app: INestApplication
let activeStreamsRepository: InMemoryActiveStreamsRepository

describe('PingStreamController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [PingStreamController],
      providers: [
        PingStreamUseCase,
        {
          provide: ActiveStreamsRepository,
          useClass: InMemoryActiveStreamsRepository,
        },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    activeStreamsRepository = module.get(ActiveStreamsRepository)
  })

  it('should return 200 on successful ping', async () => {
    activeStreamsRepository.items.push(
      ActiveStream.create(
        {
          userId: FakeAuthGuard.userId,
          profileId: 'profile-1',
          tmdbId: 550,
          type: 'movie',
        },
        new UniqueEntityID('stream-1'),
      ),
    )

    const response = await request(app.getHttpServer()).put(
      '/streams/stream-1/ping',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toBeNull()
    expect(response.body.error).toBeNull()
  })

  it('should return 404 when stream not found', async () => {
    const response = await request(app.getHttpServer()).put(
      '/streams/nonexistent/ping',
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })

  it('should return 404 when stream belongs to another user (IDOR)', async () => {
    activeStreamsRepository.items.push(
      ActiveStream.create(
        {
          userId: 'other-user-id',
          profileId: 'profile-1',
          tmdbId: 550,
          type: 'movie',
        },
        new UniqueEntityID('stream-1'),
      ),
    )

    const response = await request(app.getHttpServer()).put(
      '/streams/stream-1/ping',
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
