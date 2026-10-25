import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { MovieSourcesController } from './movie-sources.controller'
import { GetMovieSourcesUseCase } from '../../application/use-cases/get-movie-sources-use-case'
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

describe('MovieSourcesController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [MovieSourcesController],
      providers: [
        GetMovieSourcesUseCase,
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

  it('returns sources', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/movies/550/sources',
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: { sources: embedSourcesProvider.sources },
      error: null,
    })
  })

  it('should return 400 when movie id exceeds max allowed value', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/movies/100000000/sources',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })
})
