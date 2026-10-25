import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { EpisodeSourcesController } from './episode-sources.controller'
import { GetEpisodeSourcesUseCase } from '../../application/use-cases/get-episode-sources-use-case'
import { CatalogCacheService } from '../catalog-cache.service'
import { CatalogProviderPort } from '../../domain/ports/catalog-provider.port'
import { EmbedSourcesProviderPort } from '../../domain/ports/embed-sources-provider.port'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'
import { FakeEmbedSourcesProvider } from 'test/providers/fake-embed-sources-provider'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let embedSourcesProvider: FakeEmbedSourcesProvider

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
}

describe('EpisodeSourcesController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [EpisodeSourcesController],
      providers: [
        GetEpisodeSourcesUseCase,
        CatalogCacheService,
        { provide: CatalogProviderPort, useClass: FakeCatalogProvider },
        {
          provide: EmbedSourcesProviderPort,
          useClass: FakeEmbedSourcesProvider,
        },
        { provide: REDIS_CLIENT, useValue: fakeRedis },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    embedSourcesProvider = module.get(EmbedSourcesProviderPort)
  })

  it('should return 200 with episode sources', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/series/1396/seasons/1/episodes/1/sources',
    )

    expect(response.status).toBe(200)
    expect(response.body.data.sources).toEqual(embedSourcesProvider.sources)
  })

  it('returns empty list when provider has none', async () => {
    embedSourcesProvider.sources = []

    const response = await request(app.getHttpServer()).get(
      '/catalog/series/1396/seasons/1/episodes/1/sources',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: { sources: [] },
      error: null,
    })
  })

  it('rejects invalid episode', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/series/1396/seasons/1/episodes/0/sources',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when season exceeds max allowed value', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/series/1396/seasons/101/episodes/1/sources',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })
})
