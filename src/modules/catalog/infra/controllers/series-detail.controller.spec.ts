import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { SeriesDetailController } from './series-detail.controller'
import { GetSeriesDetailUseCase } from '../../application/use-cases/get-series-detail-use-case'
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

describe('SeriesDetailController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [SeriesDetailController],
      providers: [
        GetSeriesDetailUseCase,
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

  it('should return 200 with series detail', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/series/1396',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.series.id).toBe(1396)
    expect(response.body.data.series.name).toBe('Breaking Bad')
    expect(response.body.data.series.numberOfSeasons).toBe(5)
    expect(response.body.data.series.seasons).toHaveLength(1)
    expect(response.body.data.series.seasons[0].seasonNumber).toBe(1)
  })

  it('should return 400 when id exceeds max allowed value', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/series/100000000',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 404 when series not found', async () => {
    provider.seriesList = []

    const response = await request(app.getHttpServer()).get(
      '/catalog/series/999999',
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
