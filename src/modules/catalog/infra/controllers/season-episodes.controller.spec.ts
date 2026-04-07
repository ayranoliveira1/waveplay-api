import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { SeasonEpisodesController } from './season-episodes.controller'
import { GetSeasonEpisodesUseCase } from '../../application/use-cases/get-season-episodes-use-case'
import { CatalogCacheService } from '../catalog-cache.service'
import { CatalogProviderPort } from '../../domain/ports/catalog-provider.port'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let provider: FakeCatalogProvider

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
}

describe('SeasonEpisodesController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [SeasonEpisodesController],
      providers: [
        GetSeasonEpisodesUseCase,
        CatalogCacheService,
        { provide: CatalogProviderPort, useClass: FakeCatalogProvider },
        { provide: REDIS_CLIENT, useValue: fakeRedis },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    provider = module.get(CatalogProviderPort)
  })

  it('should return 200 with season episodes', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/series/1396/seasons/1',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.episodes).toHaveLength(1)
    expect(response.body.data.episodes[0].name).toBe('Pilot')
    expect(response.body.data.episodes[0].episodeNumber).toBe(1)
  })

  it('should return 400 when series id exceeds max allowed value', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/series/100000000/seasons/1',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when season exceeds max allowed value', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/series/1396/seasons/101',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 404 when season not found', async () => {
    provider.episodes = []

    const response = await request(app.getHttpServer()).get(
      '/catalog/series/1396/seasons/99',
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
