import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { randomUUID } from 'node:crypto'
import request from 'supertest'

import { DeactivateUserController } from './deactivate-user.controller'
import { DeactivateUserUseCase } from '../../application/use-cases/deactivate-user-use-case'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { RefreshTokensRepository } from '@/modules/identity/domain/repositories/refresh-tokens-repository'
import { ActiveStreamsRepository } from '@/modules/subscription/domain/repositories/active-streams-repository'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { InMemoryActiveStreamsRepository } from 'test/repositories/in-memory-active-streams-repository'
import { User, UserRole } from '@/modules/identity/domain/entities/user'
import { RefreshToken } from '@/modules/identity/domain/entities/refresh-token'
import { ActiveStream } from '@/modules/subscription/domain/entities/active-stream'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const USER_ID = '11111111-1111-4111-8111-111111111111'
const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
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

describe('DeactivateUserController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [DeactivateUserController],
      providers: [
        DeactivateUserUseCase,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
        {
          provide: RefreshTokensRepository,
          useClass: InMemoryRefreshTokensRepository,
        },
        {
          provide: ActiveStreamsRepository,
          useClass: InMemoryActiveStreamsRepository,
        },
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

  it('should return 200 and deactivate the user', async () => {
    asAdmin()

    const refreshTokensRepository =
      testModule.get<InMemoryRefreshTokensRepository>(RefreshTokensRepository)
    const activeStreamsRepository =
      testModule.get<InMemoryActiveStreamsRepository>(ActiveStreamsRepository)

    refreshTokensRepository.items.push(
      RefreshToken.createFromRawToken({
        rawToken: randomUUID(),
        userId: USER_ID,
        expiresInMs: 1000 * 60,
      }).refreshToken,
    )

    activeStreamsRepository.items.push(
      ActiveStream.create({
        userId: USER_ID,
        profileId: 'profile-1',
        tmdbId: 100,
        type: 'movie',
      }),
    )

    const response = await request(app.getHttpServer()).patch(
      `/admin/users/${USER_ID}/deactivate`,
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.user).toMatchObject({
      id: USER_ID,
      name: 'João Silva',
      email: 'joao@email.com',
      role: 'user',
      active: false,
    })
    expect(response.body.data.user.updatedAt).toBeDefined()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    expect(usersRepository.items[0].active).toBe(false)
    expect(refreshTokensRepository.items[0].isRevoked()).toBe(true)
    expect(activeStreamsRepository.items).toHaveLength(0)
  })

  it('should return 200 and be idempotent when user is already inactive', async () => {
    asAdmin()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    usersRepository.items[0].deactivate()

    const refreshTokensRepository =
      testModule.get<InMemoryRefreshTokensRepository>(RefreshTokensRepository)
    refreshTokensRepository.items.push(
      RefreshToken.createFromRawToken({
        rawToken: randomUUID(),
        userId: USER_ID,
        expiresInMs: 1000 * 60,
      }).refreshToken,
    )

    const response = await request(app.getHttpServer()).patch(
      `/admin/users/${USER_ID}/deactivate`,
    )

    expect(response.status).toBe(200)
    expect(response.body.data.user.active).toBe(false)
    expect(refreshTokensRepository.items[0].isRevoked()).toBe(false)
  })

  it('should return 404 when user does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).patch(
      `/admin/users/${MISSING_USER_ID}/deactivate`,
    )

    expect(response.status).toBe(404)
  })

  it('should return 403 when target user is admin', async () => {
    asAdmin()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    await usersRepository.create(
      User.create(
        {
          name: 'Other Admin',
          email: 'other-admin@email.com',
          passwordHash: 'hashed',
          role: UserRole.ADMIN,
        },
        new UniqueEntityID(ADMIN_ID),
      ),
    )

    const response = await request(app.getHttpServer()).patch(
      `/admin/users/${ADMIN_ID}/deactivate`,
    )

    expect(response.status).toBe(403)
    expect(usersRepository.items[1].active).toBe(true)
  })

  it('should return 400 when id is not a valid UUID', async () => {
    asAdmin()

    const response = await request(app.getHttpServer()).patch(
      '/admin/users/not-a-uuid/deactivate',
    )

    expect(response.status).toBe(400)
  })

  it('should return 403 when caller is a non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer()).patch(
      `/admin/users/${USER_ID}/deactivate`,
    )

    expect(response.status).toBe(403)
  })
})
