import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { SetCurrentAppVersionController } from './set-current-app-version.controller'
import { SetCurrentAppVersionUseCase } from '../../application/use-cases/set-current-app-version-use-case'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { UserRole } from '@/modules/identity/domain/entities/user'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const VERSION_ID = '11111111-1111-4111-8111-111111111111'
const MISSING_ID = '22222222-2222-4222-8222-222222222222'

function asAdmin() {
  FakeAuthGuard.prototype.canActivate = function (context) {
    const req = context.switchToHttp().getRequest()
    req.user = { userId: 'admin-1', role: UserRole.ADMIN }
    return true
  }
}

function asUser() {
  FakeAuthGuard.prototype.canActivate = function (context) {
    const req = context.switchToHttp().getRequest()
    req.user = { userId: 'user-1', role: UserRole.USER }
    return true
  }
}

describe('SetCurrentAppVersionController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [SetCurrentAppVersionController],
      providers: [
        SetCurrentAppVersionUseCase,
        {
          provide: MobileAppVersionsRepository,
          useClass: InMemoryMobileAppVersionsRepository,
        },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = testModule.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    const repo = testModule.get<InMemoryMobileAppVersionsRepository>(
      MobileAppVersionsRepository,
    )
    repo.items.push(
      MobileAppVersion.create(
        {
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          downloadUrl: 'u',
          fileSize: 1,
          publishedBy: 'admin-1',
        },
        new UniqueEntityID(VERSION_ID),
      ),
    )
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 200 and promote the version', async () => {
    asAdmin()
    const response = await request(app.getHttpServer()).patch(
      `/admin/app-versions/${VERSION_ID}/current`,
    )

    expect(response.status).toBe(200)
    expect(response.body.data.version.isCurrent).toBe(true)
  })

  it('should return 404 when version does not exist', async () => {
    asAdmin()
    const response = await request(app.getHttpServer()).patch(
      `/admin/app-versions/${MISSING_ID}/current`,
    )
    expect(response.status).toBe(404)
  })

  it('should return 400 for invalid UUID', async () => {
    asAdmin()
    const response = await request(app.getHttpServer()).patch(
      '/admin/app-versions/not-a-uuid/current',
    )
    expect(response.status).toBe(400)
  })

  it('should return 403 for non-admin', async () => {
    asUser()
    const response = await request(app.getHttpServer()).patch(
      `/admin/app-versions/${VERSION_ID}/current`,
    )
    expect(response.status).toBe(403)
  })
})
