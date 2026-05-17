import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { MatchDetailController } from './match-detail.controller'
import { GetMatchDetailUseCase } from '../../application/use-cases/get-match-detail-use-case'
import { SportsCacheService } from '../sports-cache.service'
import { SportsProviderPort } from '../../domain/ports/sports-provider.port'
import { YouTubeBroadcastProviderPort } from '../../domain/ports/youtube-broadcast.port'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import {
  FakeSportsProvider,
  makeFakeMatch,
} from 'test/providers/fake-sports-provider'
import {
  FakeYouTubeBroadcastProvider,
  makeFakeYouTubeLive,
} from 'test/providers/fake-youtube-broadcast-provider'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let sportsProvider: FakeSportsProvider
let youtubeProvider: FakeYouTubeBroadcastProvider

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
}

describe('MatchDetailController', () => {
  beforeEach(async () => {
    sportsProvider = new FakeSportsProvider()
    youtubeProvider = new FakeYouTubeBroadcastProvider()

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [MatchDetailController],
      providers: [
        GetMatchDetailUseCase,
        SportsCacheService,
        { provide: SportsProviderPort, useValue: sportsProvider },
        { provide: YouTubeBroadcastProviderPort, useValue: youtubeProvider },
        { provide: REDIS_CLIENT, useValue: fakeRedis },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
  })

  it('should return 200 with match and youtube when live matches', async () => {
    sportsProvider.matches = [makeFakeMatch({ id: 419123 })]
    youtubeProvider.lives = [
      makeFakeYouTubeLive({ title: 'AO VIVO Palmeiras x São Paulo' }),
    ]

    const response = await request(app.getHttpServer()).get(
      '/sports/matches/419123',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.match.id).toBe(419123)
    expect(response.body.data.youtube.videoId).toBe('abc123')
  })

  it('should return 200 with youtube null when no matching live', async () => {
    sportsProvider.matches = [makeFakeMatch({ id: 419123 })]
    youtubeProvider.lives = []

    const response = await request(app.getHttpServer()).get(
      '/sports/matches/419123',
    )

    expect(response.status).toBe(200)
    expect(response.body.data.match.id).toBe(419123)
    expect(response.body.data.youtube).toBeNull()
  })

  it('should return 404 when match does not exist', async () => {
    sportsProvider.matches = []

    const response = await request(app.getHttpServer()).get(
      '/sports/matches/999',
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when id is not numeric', async () => {
    const response = await request(app.getHttpServer()).get(
      '/sports/matches/abc',
    )

    expect(response.status).toBe(400)
  })
})
