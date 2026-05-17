import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { TodayMatchesController } from './today-matches.controller'
import { GetLiveBroadcastsUseCase } from '../../application/use-cases/get-live-broadcasts-use-case'
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

describe('TodayMatchesController', () => {
  beforeEach(async () => {
    sportsProvider = new FakeSportsProvider()
    youtubeProvider = new FakeYouTubeBroadcastProvider()

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [TodayMatchesController],
      providers: [
        GetLiveBroadcastsUseCase,
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

  it('should return 200 with empty broadcasts when no YouTube lives match', async () => {
    youtubeProvider.lives = []
    sportsProvider.matches = [makeFakeMatch()]

    const response = await request(app.getHttpServer()).get(
      '/sports/matches/today',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.broadcasts).toEqual([])
  })

  it('should return broadcast when youtube live pairs with football-data match', async () => {
    sportsProvider.matches = [makeFakeMatch()]
    youtubeProvider.lives = [
      makeFakeYouTubeLive({ title: 'AO VIVO Palmeiras x São Paulo' }),
    ]

    const response = await request(app.getHttpServer()).get(
      '/sports/matches/today',
    )

    expect(response.status).toBe(200)
    expect(response.body.data.broadcasts).toHaveLength(1)
    const broadcast = response.body.data.broadcasts[0]
    expect(broadcast.youtube.videoId).toBe('abc123')
    expect(broadcast.youtube.channelTitle).toBe('Cazé TV')
    expect(broadcast.match.homeTeam.shortName).toBe('Palmeiras')
  })

  it('should discard youtube lives whose titles do not parse as match', async () => {
    sportsProvider.matches = [makeFakeMatch()]
    youtubeProvider.lives = [
      makeFakeYouTubeLive({ title: 'Programa semanal Cazé' }),
    ]

    const response = await request(app.getHttpServer()).get(
      '/sports/matches/today',
    )

    expect(response.status).toBe(200)
    expect(response.body.data.broadcasts).toEqual([])
  })
})
