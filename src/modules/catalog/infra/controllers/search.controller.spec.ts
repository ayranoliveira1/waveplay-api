import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { SearchController } from './search.controller'
import { SearchCatalogUseCase } from '../../application/use-cases/search-catalog-use-case'
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

describe('SearchController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [SearchController],
      providers: [
        SearchCatalogUseCase,
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

  it('should return 200 with search results', async () => {
    provider.multiResults = [
      makeFakeMultiResult({ id: 1, title: 'Breaking Bad', media_type: 'tv' }),
    ]

    const response = await request(app.getHttpServer()).get(
      '/catalog/search?q=breaking&page=1',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.results).toHaveLength(1)
    expect(response.body.data.results[0].title).toBe('Breaking Bad')
    expect(response.body.data.results[0].type).toBe('series')
  })

  it('should return 400 when query is empty', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/search?q=',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })
})
