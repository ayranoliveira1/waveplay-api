import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { GetUserDetailController } from './get-user-detail.controller'
import { GetUserDetailUseCase } from '../../application/use-cases/get-user-detail-use-case'
import { AdminUserGatewayPort } from '../../application/ports/admin-user-gateway.port'
import { FakeAdminUserGateway } from 'test/ports/fake-admin-user-gateway'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { UserRole } from '@/modules/identity/domain/entities/user'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate
const VALID_UUID = '11111111-1111-4111-8111-111111111111'
const MISSING_UUID = '00000000-0000-4000-8000-000000000000'

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

describe('GetUserDetailController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [GetUserDetailController],
      providers: [
        GetUserDetailUseCase,
        { provide: AdminUserGatewayPort, useClass: FakeAdminUserGateway },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = testModule.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    const gateway = testModule.get<FakeAdminUserGateway>(AdminUserGatewayPort)
    gateway.details.set(VALID_UUID, {
      id: VALID_UUID,
      name: 'Alice Silva',
      email: 'alice@example.com',
      role: 'user',
      active: true,
      createdAt: new Date('2026-01-01'),
      subscription: {
        id: 'sub-1',
        status: 'active',
        startedAt: new Date('2026-01-01'),
        endsAt: null,
        plan: {
          id: 'plan-1',
          name: 'Premium',
          slug: 'premium',
          maxProfiles: 4,
          maxStreams: 4,
        },
      },
      profiles: [{ id: 'profile-1', name: 'Alice', isKid: false }],
    })
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 200 with full details for admin', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).get(
      `/admin/users/${VALID_UUID}`,
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toMatchObject({
      id: VALID_UUID,
      name: 'Alice Silva',
      email: 'alice@example.com',
      role: 'user',
      active: true,
    })
    expect(response.body.data.subscription.plan.slug).toBe('premium')
    expect(response.body.data.profiles).toHaveLength(1)
  })

  it('should return 404 when user does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).get(
      `/admin/users/${MISSING_UUID}`,
    )

    expect(response.status).toBe(404)
  })

  it('should return 400 when id is not a UUID', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).get(
      '/admin/users/not-a-uuid',
    )

    expect(response.status).toBe(400)
  })

  it('should return 403 for non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer()).get(
      `/admin/users/${VALID_UUID}`,
    )

    expect(response.status).toBe(403)
  })
})
