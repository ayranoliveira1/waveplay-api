import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { MovieDetailController } from './movie-detail.controller'
import { GetMovieDetailUseCase } from '../../application/use-cases/get-movie-detail-use-case'
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

describe('MovieDetailController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [MovieDetailController],
      providers: [
        GetMovieDetailUseCase,
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

  it('should return 200 with movie detail', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/movies/550',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.movie.id).toBe(550)
    expect(response.body.data.movie.title).toBe('Clube da Luta')
    expect(response.body.data.movie.rating).toBe(8.4)
    expect(response.body.data.movie.genres).toBeDefined()
    expect(response.body.data.movie.originalLanguage).toBe('en')
  })

  it('should return 404 when movie not found', async () => {
    provider.movies = []

    const response = await request(app.getHttpServer()).get(
      '/catalog/movies/999999',
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
