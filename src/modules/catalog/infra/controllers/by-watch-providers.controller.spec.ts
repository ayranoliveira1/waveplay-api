import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ByWatchProvidersController } from './by-watch-providers.controller'
import { GetByWatchProvidersUseCase } from '../../application/use-cases/get-by-watch-providers-use-case'
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

describe('ByWatchProvidersController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ByWatchProvidersController],
      providers: [
        GetByWatchProvidersUseCase,
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

  it('should return 200 with merged movies and series', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/by-watch-providers?providers=8&page=1',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.results.length).toBeGreaterThan(0)
    expect(response.body.data.page).toBe(1)
  })

  it('should accept multiple provider ids separated by comma', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/by-watch-providers?providers=8,337&page=1',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  })

  it('should default page to 1 when omitted', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/by-watch-providers?providers=8',
    )

    expect(response.status).toBe(200)
    expect(response.body.data.page).toBe(1)
  })

  it('should return 400 when providers is missing', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/by-watch-providers',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when providers is not numeric', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/by-watch-providers?providers=abc',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when page is below 1', async () => {
    const response = await request(app.getHttpServer()).get(
      '/catalog/by-watch-providers?providers=8&page=0',
    )

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })
})
