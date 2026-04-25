import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { GetCurrentAppVersionController } from './get-current-app-version.controller'
import { GetCurrentAppVersionUseCase } from '../../application/use-cases/get-current-app-version-use-case'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let testModule: TestingModule

describe('GetCurrentAppVersionController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [GetCurrentAppVersionController],
      providers: [
        GetCurrentAppVersionUseCase,
        {
          provide: MobileAppVersionsRepository,
          useClass: InMemoryMobileAppVersionsRepository,
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = testModule.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
  })

  it('should return 200 with public shape when there is a current version', async () => {
    const repo = testModule.get<InMemoryMobileAppVersionsRepository>(
      MobileAppVersionsRepository,
    )
    repo.items.push(
      MobileAppVersion.create(
        {
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          downloadUrl: 'https://r2/apks/1.0.0.apk',
          fileSize: 30_000_000,
          publishedBy: 'admin-1',
          isCurrent: true,
          releaseNotes: 'Bug fixes',
          forceUpdate: false,
        },
        new UniqueEntityID('v1'),
      ),
    )

    const response = await request(app.getHttpServer()).get('/app/version')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toMatchObject({
      version: '1.0.0',
      downloadUrl: 'https://r2/apks/1.0.0.apk',
      forceUpdate: false,
      releaseNotes: 'Bug fixes',
    })
    // Nao deve vazar campos internos
    expect(response.body.data.id).toBeUndefined()
    expect(response.body.data.storageKey).toBeUndefined()
    expect(response.body.data.publishedBy).toBeUndefined()
    expect(response.body.data.fileSize).toBeUndefined()
  })

  it('should return 404 when no current version is set', async () => {
    const response = await request(app.getHttpServer()).get('/app/version')

    expect(response.status).toBe(404)
  })
})
