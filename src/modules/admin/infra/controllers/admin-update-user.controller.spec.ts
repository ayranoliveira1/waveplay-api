import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { AdminUpdateUserController } from './admin-update-user.controller'
import { AdminUpdateUserUseCase } from '../../application/use-cases/admin-update-user-use-case'
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
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'
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

describe('AdminUpdateUserController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [AdminUpdateUserController],
      providers: [
        AdminUpdateUserUseCase,
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
        },
        new UniqueEntityID(USER_ID),
      ),
    )
  })

  afterEach(() => {
    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 200 and update the name', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}`)
      .send({ name: 'João Santos' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.user).toMatchObject({
      id: USER_ID,
      name: 'João Santos',
      email: 'joao@email.com',
      role: 'user',
      active: true,
    })
    expect(response.body.data.user.updatedAt).toBeDefined()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    expect(usersRepository.items[0].name).toBe('João Santos')
  })

  it('should return 200 and update the email (normalized)', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}`)
      .send({ email: 'Novo@Email.COM' })

    expect(response.status).toBe(200)
    expect(response.body.data.user.email).toBe('novo@email.com')

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    expect(usersRepository.items[0].email).toBe('novo@email.com')
  })

  it('should return 404 when user does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${MISSING_USER_ID}`)
      .send({ name: 'Qualquer' })

    expect(response.status).toBe(404)
  })

  it('should return 409 when email conflicts with another user', async () => {
    asAdmin()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    await usersRepository.create(
      User.create(
        {
          name: 'Maria',
          email: 'maria@email.com',
          passwordHash: 'hashed',
        },
        new UniqueEntityID(OTHER_USER_ID),
      ),
    )

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}`)
      .send({ email: 'maria@email.com' })

    expect(response.status).toBe(409)
  })

  it('should return 400 when body is empty', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}`)
      .send({})

    expect(response.status).toBe(400)
  })

  it('should return 400 when body has extra fields (strict)', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}`)
      .send({ name: 'João Santos', role: 'admin' })

    expect(response.status).toBe(400)
  })

  it('should return 400 when id is not a valid UUID', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .patch('/admin/users/not-a-uuid')
      .send({ name: 'João Santos' })

    expect(response.status).toBe(400)
  })

  it('should return 403 when caller is a non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer())
      .patch(`/admin/users/${USER_ID}`)
      .send({ name: 'João Santos' })

    expect(response.status).toBe(403)
  })
})
