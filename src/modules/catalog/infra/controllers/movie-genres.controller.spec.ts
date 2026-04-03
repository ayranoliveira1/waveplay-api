import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { MovieGenresController } from './movie-genres.controller'
import { GetMovieGenresUseCase } from '../../application/use-cases/get-movie-genres-use-case'
import { CatalogCacheService } from '../catalog-cache.service'
import { CatalogProviderPort } from '../../domain/ports/catalog-provider.port'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import { FakeCatalogProvider } from 'test/providers/fake-catalog-provider'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
}

describe('MovieGenresController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [MovieGenresController],
      providers: [
        GetMovieGenresUseCase,
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
  })

  it('should return 200 with movie genres', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/genres/movies',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.genres).toHaveLength(2)
    expect(response.body.data.genres[0]).toHaveProperty('id')
    expect(response.body.data.genres[0]).toHaveProperty('name')
  })
})
