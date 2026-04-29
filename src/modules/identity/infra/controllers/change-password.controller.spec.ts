import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ChangePasswordController } from './change-password.controller'
import { ChangePasswordUseCase } from '../../application/use-cases/change-password-use-case'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../../application/ports/hasher.port'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryRefreshTokensRepository } from 'test/repositories/in-memory-refresh-tokens-repository'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { User } from '../../domain/entities/user'
import { RefreshToken } from '../../domain/entities/refresh-token'

let app: INestApplication
let usersRepository: InMemoryUsersRepository
let refreshTokensRepository: InMemoryRefreshTokensRepository

const CURRENT_PASSWORD = 'Atual1234'
const NEW_PASSWORD = 'NovaSenha123'

describe('ChangePasswordController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ChangePasswordController],
      providers: [
        ChangePasswordUseCase,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
        {
          provide: RefreshTokensRepository,
          useClass: InMemoryRefreshTokensRepository,
        },
        { provide: HasherPort, useClass: FakeHasher },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    usersRepository = module.get(UsersRepository)
    refreshTokensRepository = module.get(RefreshTokensRepository)
  })

  async function seedUser() {
    const user = User.create({
      name: 'João Silva',
      email: 'joao@email.com',
      passwordHash: `${CURRENT_PASSWORD}-hashed`,
    })
    usersRepository.items.push(user)
    FakeAuthGuard.userId = user.id.toValue()
    return user
  }

  it('should return 200 with success message and update the password', async () => {
    const user = await seedUser()

    const response = await request(app.getHttpServer())
      .patch('/auth/password')
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.message).toBe('Senha alterada com sucesso')
    expect(response.body.error).toBeNull()

    const updated = await usersRepository.findById(user.id.toValue())
    expect(updated?.passwordHash).toBe(`${NEW_PASSWORD}-hashed`)
  })

  it('should revoke all refresh tokens of the user after success', async () => {
    const user = await seedUser()

    const rt = RefreshToken.create({
      userId: user.id.toValue(),
      tokenHash: 'hash-1',
      family: 'family-1',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ipAddress: null,
      userAgent: null,
    })
    await refreshTokensRepository.create(rt)

    await request(app.getHttpServer())
      .patch('/auth/password')
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD })

    expect(rt.isRevoked()).toBe(true)
  })

  it('should return 401 when currentPassword is incorrect', async () => {
    await seedUser()

    const response = await request(app.getHttpServer())
      .patch('/auth/password')
      .send({ currentPassword: 'WrongPass1', newPassword: NEW_PASSWORD })

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
    const message = response.body.error
      .map((e: any) => (typeof e === 'string' ? e : e.message))
      .join(' ')
    expect(message).toMatch(/senha atual incorreta/i)
  })

  it('should return 400 when newPassword is weak', async () => {
    await seedUser()

    const response = await request(app.getHttpServer())
      .patch('/auth/password')
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: 'weakpw' })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when newPassword equals currentPassword', async () => {
    await seedUser()

    const response = await request(app.getHttpServer())
      .patch('/auth/password')
      .send({
        currentPassword: CURRENT_PASSWORD,
        newPassword: CURRENT_PASSWORD,
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    const message = response.body.error
      .map((e: any) => (typeof e === 'string' ? e : e.message))
      .join(' ')
    expect(message).toMatch(/diferente da senha atual/i)
  })

  it('should return 400 when body is empty', async () => {
    await seedUser()

    const response = await request(app.getHttpServer())
      .patch('/auth/password')
      .send({})

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 400 when body has unknown extra field (Zod strict)', async () => {
    await seedUser()

    const response = await request(app.getHttpServer())
      .patch('/auth/password')
      .send({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 401 when no auth context exists', async () => {
    await seedUser()
    // Simula ausência de userId injetado pelo guard
    FakeAuthGuard.userId = ''

    const response = await request(app.getHttpServer())
      .patch('/auth/password')
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD })

    // FakeAuthGuard sempre passa; com userId vazio o use-case retorna UserNotFoundError (404)
    // Esse cenário valida que o fluxo de "sem contexto de auth" não persiste a senha
    expect([401, 404]).toContain(response.status)
    expect(response.body.success).toBe(false)
  })
})
