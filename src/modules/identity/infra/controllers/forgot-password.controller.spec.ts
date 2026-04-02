import { describe, it, expect, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
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

let app: INestApplication

describe('ForgotPasswordController', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
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

    app = module.createNestApplication()
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
