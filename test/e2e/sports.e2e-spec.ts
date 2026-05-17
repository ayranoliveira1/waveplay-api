import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ThrottlerStorage } from '@nestjs/throttler'
import request from 'supertest'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { AppModule } from '@/app.module'
import { SportsProviderPort } from '@/modules/sports/domain/ports/sports-provider.port'
import { YouTubeBroadcastProviderPort } from '@/modules/sports/domain/ports/youtube-broadcast.port'
import { EmailSenderPort } from '@/shared/email/email-sender.port'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import {
  FakeSportsProvider,
  makeFakeMatch,
} from 'test/providers/fake-sports-provider'
import {
  FakeYouTubeBroadcastProvider,
  makeFakeYouTubeLive,
} from 'test/providers/fake-youtube-broadcast-provider'
import { FakeEmailSender } from 'test/ports/fake-email-sender'
import { registerUser, authHeader, fullCleanup } from './helpers/e2e-helpers'

const noOpThrottlerStorage = {
  storage: new Map(),
  increment: async () => ({
    totalHits: 0,
    timeToExpire: 0,
    isBlocked: false,
    timeToBlockExpire: 0,
  }),
}

describe('Sports — Hub YouTube-first (E2E)', () => {
  let app: INestApplication
  let accessToken: string
  let sportsProvider: FakeSportsProvider
  let youtubeProvider: FakeYouTubeBroadcastProvider

  beforeAll(async () => {
    sportsProvider = new FakeSportsProvider()
    sportsProvider.matches = [makeFakeMatch({ id: 419123 })]
    youtubeProvider = new FakeYouTubeBroadcastProvider()
    youtubeProvider.lives = [
      makeFakeYouTubeLive({ title: 'AO VIVO Palmeiras x São Paulo' }),
    ]

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailSenderPort)
      .useValue(new FakeEmailSender())
      .overrideProvider(SportsProviderPort)
      .useValue(sportsProvider)
      .overrideProvider(YouTubeBroadcastProviderPort)
      .useValue(youtubeProvider)
      .overrideProvider(ThrottlerStorage)
      .useValue(noOpThrottlerStorage)
      .compile()

    app = moduleRef.createNestApplication()
    app.use(helmet())
    app.use(cookieParser())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    await fullCleanup(app)

    const auth = await registerUser(app)
    if (!auth.accessToken) {
      throw new Error(
        `registerUser failed: status=${auth.response.status} body=${JSON.stringify(auth.response.body)}`,
      )
    }
    accessToken = auth.accessToken
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /sports/matches/today', () => {
    it('returns 200 with broadcasts paired with YouTube lives', async () => {
      const res = await request(app.getHttpServer())
        .get('/sports/matches/today')
        .set(authHeader(accessToken))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.broadcasts).toHaveLength(1)
      expect(res.body.data.broadcasts[0].youtube.videoId).toBe('abc123')
      expect(res.body.data.broadcasts[0].match.id).toBe(419123)
    })

    it('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app.getHttpServer()).get(
        '/sports/matches/today',
      )

      expect(res.status).toBe(401)
    })
  })

  describe('GET /sports/matches/:id', () => {
    it('returns 200 with match detail + youtube when live matches', async () => {
      const res = await request(app.getHttpServer())
        .get('/sports/matches/419123')
        .set(authHeader(accessToken))

      expect(res.status).toBe(200)
      expect(res.body.data.match.id).toBe(419123)
      expect(res.body.data.youtube.videoId).toBe('abc123')
    })

    it('returns 404 when match does not exist', async () => {
      const res = await request(app.getHttpServer())
        .get('/sports/matches/999')
        .set(authHeader(accessToken))

      expect(res.status).toBe(404)
    })

    it('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app.getHttpServer()).get(
        '/sports/matches/419123',
      )

      expect(res.status).toBe(401)
    })
  })
})
