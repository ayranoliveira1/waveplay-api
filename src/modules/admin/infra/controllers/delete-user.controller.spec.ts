import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { DeleteUserController } from './delete-user.controller'
import { DeleteUserUseCase } from '../../application/use-cases/delete-user-use-case'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { User, UserRole } from '@/modules/identity/domain/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const INACTIVE_USER_ID = '11111111-1111-4111-8111-111111111111'
const ACTIVE_USER_ID = '22222222-2222-4222-8222-222222222222'
const ADMIN_ID = '33333333-3333-4333-8333-333333333333'
const MISSING_USER_ID = '44444444-4444-4444-8444-444444444444'

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

describe('DeleteUserController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [DeleteUserController],
      providers: [
        DeleteUserUseCase,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = testModule.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)

    const inactive = User.create(
      {
        name: 'Inactive User',
        email: 'inactive@email.com',
        passwordHash: 'hashed',
      },
      new UniqueEntityID(INACTIVE_USER_ID),
    )
    inactive.deactivate()
    await usersRepository.create(inactive)
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 204 and remove the user from repository', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      `/admin/users/${INACTIVE_USER_ID}`,
    )

    expect(response.status).toBe(204)
    expect(response.body).toEqual({})

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    expect(usersRepository.items).toHaveLength(0)
  })

  it('should return 409 when user is still active', async () => {
    asAdmin()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    await usersRepository.create(
      User.create(
        {
          name: 'Active User',
          email: 'active@email.com',
          passwordHash: 'hashed',
        },
        new UniqueEntityID(ACTIVE_USER_ID),
      ),
    )

    const response = await request(app.getHttpServer()).delete(
      `/admin/users/${ACTIVE_USER_ID}`,
    )

    expect(response.status).toBe(409)
    expect(usersRepository.items).toHaveLength(2)
  })

  it('should return 404 when user does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      `/admin/users/${MISSING_USER_ID}`,
    )

    expect(response.status).toBe(404)
  })

  it('should return 403 when target user is admin', async () => {
    asAdmin()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    const admin = User.create(
      {
        name: 'Admin Target',
        email: 'admin-target@email.com',
        passwordHash: 'hashed',
        role: UserRole.ADMIN,
      },
      new UniqueEntityID(ADMIN_ID),
    )
    admin.deactivate()
    await usersRepository.create(admin)

    const response = await request(app.getHttpServer()).delete(
      `/admin/users/${ADMIN_ID}`,
    )

    expect(response.status).toBe(403)
    expect(usersRepository.items.some((u) => u.id.toValue() === ADMIN_ID)).toBe(
      true,
    )
  })

  it('should return 400 when id is not a valid UUID', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).delete(
      '/admin/users/not-a-uuid',
    )

    expect(response.status).toBe(400)
  })

  it('should return 403 when caller is a non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer()).delete(
      `/admin/users/${INACTIVE_USER_ID}`,
    )

    expect(response.status).toBe(403)
  })
})
