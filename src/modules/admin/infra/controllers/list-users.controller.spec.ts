import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ListUsersController } from './list-users.controller'
import { ListUsersUseCase } from '../../application/use-cases/list-users-use-case'
import { AdminUserGatewayPort } from '../../application/ports/admin-user-gateway.port'
import { FakeAdminUserGateway } from 'test/ports/fake-admin-user-gateway'
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

describe('ListUsersController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ListUsersController],
      providers: [
        ListUsersUseCase,
        { provide: AdminUserGatewayPort, useClass: FakeAdminUserGateway },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = testModule.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    const gateway = testModule.get<FakeAdminUserGateway>(AdminUserGatewayPort)
    gateway.users.push(
      {
        id: 'user-1',
        name: 'Alice Silva',
        email: 'alice@example.com',
        role: 'user',
        subscription: {
          id: 'sub-1',
          status: 'active',
          planName: 'Básico',
          planSlug: 'basico',
          endsAt: null,
        },
        profilesCount: 1,
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'user-2',
        name: 'Bob Costa',
        email: 'bob@example.com',
        role: 'user',
        subscription: null,
        profilesCount: 0,
        createdAt: new Date('2026-01-02'),
      },
    )
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 200 with paginated shape for admin', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).get('/admin/users')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.users).toHaveLength(2)
    expect(response.body.data.page).toBeDefined()
    expect(response.body.data.totalPages).toBeDefined()
    expect(response.body.data.totalItems).toBe(2)
    expect(response.body.data.users[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
      profilesCount: expect.any(Number),
    })
  })

  it('should filter by search case-insensitively', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ search: 'alice' })

    expect(response.status).toBe(200)
    expect(response.body.data.users).toHaveLength(1)
    expect(response.body.data.users[0].email).toBe('alice@example.com')

    const gateway = testModule.get<FakeAdminUserGateway>(AdminUserGatewayPort)
    expect(gateway.lastListCall?.search).toBe('alice')
  })

  it('should use defaults page=1 perPage=20', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).get('/admin/users')

    expect(response.status).toBe(200)
    expect(response.body.data.page).toBe(1)

    const gateway = testModule.get<FakeAdminUserGateway>(AdminUserGatewayPort)
    expect(gateway.lastListCall?.page).toBe(1)
    expect(gateway.lastListCall?.perPage).toBe(20)
  })

  it('should return 400 when perPage > 100', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ perPage: '101' })

    expect(response.status).toBe(400)
  })

  it('should return 400 when page is not a number', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ page: 'abc' })

    expect(response.status).toBe(400)
  })

  it('should return 403 for non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer()).get('/admin/users')

    expect(response.status).toBe(403)
  })
})
