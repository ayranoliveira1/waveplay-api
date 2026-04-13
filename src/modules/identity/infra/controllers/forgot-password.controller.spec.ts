import { describe, it, expect, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ForgotPasswordController } from './forgot-password.controller'
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password-use-case'
import { InMemoryUsersRepository } from 'test/repositories/in-memory-users-repository'
import { InMemoryPasswordResetTokensRepository } from 'test/repositories/in-memory-password-reset-tokens-repository'
import { FakeEmailSender } from 'test/ports/fake-email-sender'
import { FakeAuthConfig } from 'test/ports/fake-auth-config'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { PasswordResetTokensRepository } from '../../domain/repositories/password-reset-tokens-repository'
import { EmailSenderPort } from '@/shared/email/email-sender.port'
import { AuthConfigPort } from '../../application/ports/auth-config.port'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { User } from '../../domain/entities/user'
import type { TestingModule } from '@nestjs/testing'

let app: INestApplication
let testModule: TestingModule

describe('ForgotPasswordController', () => {
  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ForgotPasswordController],
      providers: [
        ForgotPasswordUseCase,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
        {
          provide: PasswordResetTokensRepository,
          useClass: InMemoryPasswordResetTokensRepository,
        },
        { provide: EmailSenderPort, useClass: FakeEmailSender },
        { provide: AuthConfigPort, useClass: FakeAuthConfig },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = testModule.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
  })

  it('should return 200 for forgot-password request', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'joao@email.com' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  })

  it('should normalize email before triggering reset flow', async () => {
    const usersRepository =
      testModule.get<InMemoryUsersRepository>(UsersRepository)
    const emailSender = testModule.get<FakeEmailSender>(EmailSenderPort)

    await usersRepository.create(
      User.create({
        name: 'João Silva',
        email: 'joao@email.com',
        passwordHash: 'hashed',
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'Joao@Email.COM' })

    expect(response.status).toBe(200)
    expect(emailSender.emailsSent).toHaveLength(1)
    expect(emailSender.emailsSent[0].to).toBe('joao@email.com')
  })

  it('should return 429 after exceeding rate limit (3 req/min)', async () => {
    // Limit is 3 per minute on forgot-password
    for (let i = 0; i < 3; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'joao@email.com' })

      expect(res.status).toBe(200)
    }

    // 4th request should be throttled
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'joao@email.com' })

    expect(response.status).toBe(429)
  })
})
