import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ActivateUserController } from './activate-user.controller'
import { ActivateUserUseCase } from '../../application/use-cases/activate-user-use-case'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { User, UserRole } from '@/modules/identity/domain/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const USER_ID = '11111111-1111-4111-8111-111111111111'
const MISSING_USER_ID = '33333333-3333-4333-8333-333333333333'

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

describe('ActivateUserController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ActivateUserController],
      providers: [
        ActivateUserUseCase,
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

    await usersRepository.create(
      User.create(
        {
          name: 'João Silva',
          email: 'joao@email.com',
          passwordHash: 'hashed',
          active: false,
        },
        new UniqueEntityID(USER_ID),
      ),
    )
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 200 and activate the user', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).patch(
      `/admin/users/${USER_ID}/activate`,
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.user).toMatchObject({
      id: USER_ID,
      name: 'João Silva',
      email: 'joao@email.com',
      role: 'user',
      active: true,
    })

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    expect(usersRepository.items[0].active).toBe(true)
  })

  it('should return 200 and be idempotent when user is already active', async () => {
    asAdmin()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    usersRepository.items[0].activate()
    const previousUpdatedAt = usersRepository.items[0].updatedAt

    const response = await request(app.getHttpServer()).patch(
      `/admin/users/${USER_ID}/activate`,
    )

    expect(response.status).toBe(200)
    expect(response.body.data.user.active).toBe(true)
    expect(usersRepository.items[0].updatedAt.getTime()).toBe(
      previousUpdatedAt.getTime(),
    )
  })

  it('should return 404 when user does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).patch(
      `/admin/users/${MISSING_USER_ID}/activate`,
    )

    expect(response.status).toBe(404)
  })

  it('should return 400 when id is not a valid UUID', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).patch(
      '/admin/users/not-a-uuid/activate',
    )

    expect(response.status).toBe(400)
  })

  it('should return 403 when caller is a non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer()).patch(
      `/admin/users/${USER_ID}/activate`,
    )

    expect(response.status).toBe(403)
  })
})
