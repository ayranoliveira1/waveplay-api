import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { AdminCreateUserController } from './admin-create-user.controller'
import { AdminCreateUserUseCase } from '../../application/use-cases/admin-create-user-use-case'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { HasherPort } from '@/modules/identity/application/ports/hasher.port'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { SubscriptionsRepository } from '@/modules/subscription/domain/repositories/subscriptions-repository'
import { InMemorySubscriptionsRepository } from 'test/repositories/in-memory-subscriptions-repository'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { InMemoryPlansRepository } from 'test/repositories/in-memory-plans-repository'
import { ProfilesRepository } from '@/modules/profile/domain/repositories/profiles-repository'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { User } from '@/modules/identity/domain/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { UserRole } from '@/modules/identity/domain/entities/user'

let app: INestApplication
let testModule: TestingModule

const originalCanActivate = FakeAuthGuard.prototype.canActivate

const PLAN_ID = '11111111-1111-4111-8111-111111111111'
const MISSING_PLAN_ID = '22222222-2222-4222-8222-222222222222'

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

describe('AdminCreateUserController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [AdminCreateUserController],
      providers: [
        AdminCreateUserUseCase,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
        { provide: HasherPort, useClass: FakeHasher },
        {
          provide: SubscriptionsRepository,
          useClass: InMemorySubscriptionsRepository,
        },
        { provide: ProfilesRepository, useClass: InMemoryProfilesRepository },
        {
          provide: PlansRepository,
          useFactory: () => {
            const repo = new InMemoryPlansRepository()
            repo.items.push(
              Plan.create(
                {
                  name: 'Premium',
                  slug: 'premium',
                  priceCents: 2990,
                  maxProfiles: 4,
                  maxStreams: 4,
                },
                new UniqueEntityID(PLAN_ID),
              ),
            )
            return repo
          },
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

  it('should return 201 with created user (without passwordHash)', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        name: 'Alice Silva',
        email: 'alice@example.com',
        password: 'SenhaForte1',
        planId: PLAN_ID,
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      name: 'Alice Silva',
      email: 'alice@example.com',
      role: 'user',
    })
    expect(response.body.data.passwordHash).toBeUndefined()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    const subscriptionsRepository =
      testModule.get<InMemorySubscriptionsRepository>(SubscriptionsRepository)
    const profilesRepository =
      testModule.get<InMemoryProfilesRepository>(ProfilesRepository)

    expect(usersRepository.items).toHaveLength(1)
    expect(subscriptionsRepository.items).toHaveLength(1)
    expect(profilesRepository.items).toHaveLength(1)
    expect(profilesRepository.items[0].name).toBe('Alice Silva')
  })

  it('should return 409 when email already exists', async () => {
    asAdmin()

    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    usersRepository.items.push(
      User.create({
        name: 'Existing',
        email: 'alice@example.com',
        passwordHash: 'hash',
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        name: 'Alice Silva',
        email: 'alice@example.com',
        password: 'SenhaForte1',
        planId: PLAN_ID,
      })

    expect(response.status).toBe(409)
  })

  it('should return 400 for weak password', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        name: 'Alice Silva',
        email: 'alice@example.com',
        password: 'weakpass',
        planId: PLAN_ID,
      })

    expect(response.status).toBe(400)
  })

  it('should return 400 when body has extra field (strict mode)', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        name: 'Alice Silva',
        email: 'alice@example.com',
        password: 'SenhaForte1',
        planId: PLAN_ID,
        role: 'admin',
      })

    expect(response.status).toBe(400)
  })

  it('should return 404 when planId is a valid UUID but does not exist', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        name: 'Alice Silva',
        email: 'alice@example.com',
        password: 'SenhaForte1',
        planId: MISSING_PLAN_ID,
      })

    expect(response.status).toBe(404)
  })

  it('should return 400 when name is empty', async () => {
    asAdmin()

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        name: '',
        email: 'alice@example.com',
        password: 'SenhaForte1',
        planId: PLAN_ID,
      })

    expect(response.status).toBe(400)
  })

  it('should return 403 for non-admin user', async () => {
    asUser()

    const response = await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        name: 'Alice Silva',
        email: 'alice@example.com',
        password: 'SenhaForte1',
        planId: PLAN_ID,
      })

    expect(response.status).toBe(403)
  })
})
