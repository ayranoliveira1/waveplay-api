import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ThrottlerStorage } from '@nestjs/throttler'
import request from 'supertest'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import { AppModule } from '@/app.module'
import { CatalogProviderPort } from '@/modules/catalog/domain/ports/catalog-provider.port'
import { EmailSenderPort } from '@/shared/email/email-sender.port'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import {
  FakeCatalogProvider,
  makeFakeMovie,
  makeFakeSeries,
} from 'test/providers/fake-catalog-provider'
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

describe('Catalog by watch providers (E2E)', () => {
  let app: INestApplication
  let accessToken: string

  beforeAll(async () => {
    const fakeProvider = new FakeCatalogProvider()
    fakeProvider.movies = [
      makeFakeMovie({ id: 1, popularity: 100 }),
      makeFakeMovie({ id: 2, popularity: 60 }),
    ]
    fakeProvider.seriesList = [
      makeFakeSeries({ id: 10, popularity: 80 }),
      makeFakeSeries({ id: 11, popularity: 40 }),
    ]

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailSenderPort)
      .useValue(new FakeEmailSender())
      .overrideProvider(CatalogProviderPort)
      .useValue(fakeProvider)
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

  it('returns 200 with merged movies+series sorted by popularity', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/by-watch-providers?providers=8')
      .set(authHeader(accessToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.results).toHaveLength(4)
    expect(res.body.data.results[0].id).toBe(1)
    expect(res.body.data.results[1].id).toBe(10)
    expect(res.body.data.results[0].type).toBe('movie')
    expect(res.body.data.results[1].type).toBe('series')
    expect(res.body.data.page).toBe(1)
  })

  it('accepts multiple providers separated by comma', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/by-watch-providers?providers=8,337')
      .set(authHeader(accessToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.results.length).toBeGreaterThan(0)
  })

  it('returns 400 when providers query is missing', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/by-watch-providers')
      .set(authHeader(accessToken))

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns 400 when providers is not numeric', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog/by-watch-providers?providers=abc')
      .set(authHeader(accessToken))

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app.getHttpServer()).get(
      '/catalog/by-watch-providers?providers=8',
    )

    expect(res.status).toBe(401)
  })
})
