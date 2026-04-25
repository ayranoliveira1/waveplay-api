import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { DeleteAppVersionController } from './delete-app-version.controller'
import { DeleteAppVersionUseCase } from '../../application/use-cases/delete-app-version-use-case'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { ObjectStoragePort } from '../../application/ports/object-storage.port'
import { FakeObjectStorage } from 'test/ports/fake-object-storage'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { UserRole } from '@/modules/identity/domain/entities/user'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const NON_CURRENT_ID = '11111111-1111-4111-8111-111111111111'
const CURRENT_ID = '22222222-2222-4222-8222-222222222222'
const MISSING_ID = '33333333-3333-4333-8333-333333333333'

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

describe('DeleteAppVersionController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [DeleteAppVersionController],
      providers: [
        DeleteAppVersionUseCase,
        {
          provide: MobileAppVersionsRepository,
          useClass: InMemoryMobileAppVersionsRepository,
        },
        { provide: ObjectStoragePort, useClass: FakeObjectStorage },
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
          isCurrent: false,
        },
        new UniqueEntityID(NON_CURRENT_ID),
      ),
      MobileAppVersion.create(
        {
          version: '1.0.1',
          storageKey: 'apks/1.0.1.apk',
          downloadUrl: 'u',
          fileSize: 1,
          publishedBy: 'admin-1',
          isCurrent: true,
        },
        new UniqueEntityID(CURRENT_ID),
      ),
    )
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 204 and delete the version', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      `/admin/app-versions/${NON_CURRENT_ID}`,
    )

    expect(response.status).toBe(204)

    const storage = testModule.get<FakeObjectStorage>(ObjectStoragePort)
    expect(storage.deletedKeys).toContain('apks/1.0.0.apk')
  })

  it('should return 404 when version does not exist', async () => {
    asAdmin()
    const response = await request(app.getHttpServer()).delete(
      `/admin/app-versions/${MISSING_ID}`,
    )
    expect(response.status).toBe(404)
  })

  it('should return 409 when version is current', async () => {
    asAdmin()
    const response = await request(app.getHttpServer()).delete(
      `/admin/app-versions/${CURRENT_ID}`,
    )
    expect(response.status).toBe(409)
  })

  it('should return 403 for non-admin', async () => {
    asUser()
    const response = await request(app.getHttpServer()).delete(
      `/admin/app-versions/${NON_CURRENT_ID}`,
    )
    expect(response.status).toBe(403)
  })
})
