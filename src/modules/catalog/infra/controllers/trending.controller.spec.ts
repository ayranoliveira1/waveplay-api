import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { TrendingController } from './trending.controller'
import { GetTrendingUseCase } from '../../application/use-cases/get-trending-use-case'
import { CatalogCacheService } from '../catalog-cache.service'
import { CatalogProviderPort } from '../../domain/ports/catalog-provider.port'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import {
  FakeCatalogProvider,
  makeFakeMultiResult,
} from 'test/providers/fake-catalog-provider'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let provider: FakeCatalogProvider

const fakeRedis = {
  get: async () => null,
  set: async () => 'OK',
}

describe('TrendingController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [TrendingController],
      providers: [
        GetTrendingUseCase,
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

  it('should return 200 with trending results', async () => {
    provider.multiResults = [
      makeFakeMultiResult({ id: 1, title: 'Filme 1' }),
      makeFakeMultiResult({ id: 2, title: 'Filme 2' }),
    ]

    const response = await request(app.getHttpServer()).get(
      '/catalog/trending?page=1',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.results).toHaveLength(2)
    expect(response.body.data.results[0].id).toBe(1)
    expect(response.body.data.results[0].title).toBe('Filme 1')
    expect(response.body.data.page).toBe(1)
    expect(response.body.data.totalPages).toBe(1)
  })

  it('should return 200 with empty array when no trending', async () => {
    provider.multiResults = []

    const response = await request(app.getHttpServer()).get(
      '/catalog/trending?page=1',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.results).toHaveLength(0)
  })
})
