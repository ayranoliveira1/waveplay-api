import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ListAppVersionsController } from './list-app-versions.controller'
import { ListAppVersionsUseCase } from '../../application/use-cases/list-app-versions-use-case'
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

describe('ListAppVersionsController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ListAppVersionsController],
      providers: [
        ListAppVersionsUseCase,
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
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 200 with all versions for admin', async () => {
    asAdmin()

    const repo = testModule.get<InMemoryMobileAppVersionsRepository>(
      MobileAppVersionsRepository,
    )
    repo.items.push(
      MobileAppVersion.create(
        {
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          downloadUrl: 'u',
          fileSize: 1000,
          publishedBy: 'admin-1',
        },
        new UniqueEntityID('v1'),
      ),
    )

    const response = await request(app.getHttpServer()).get(
      '/admin/app-versions',
    )

    expect(response.status).toBe(200)
    expect(response.body.data.versions).toHaveLength(1)
    expect(response.body.data.versions[0]).toMatchObject({
      id: 'v1',
      version: '1.0.0',
      isCurrent: false,
    })
  })

  it('should return 403 for non-admin', async () => {
    asUser()
    const response = await request(app.getHttpServer()).get(
      '/admin/app-versions',
    )
    expect(response.status).toBe(403)
  })
})
