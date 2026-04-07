import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { SaveProgressController } from './save-progress.controller'
import { SaveProgressUseCase } from '../../application/use-cases/save-progress-use-case'
import { ProgressRepository } from '../../domain/repositories/progress-repository'
import { ProfileOwnershipGatewayPort } from '../../application/ports/profile-ownership-gateway.port'
import { InMemoryProgressRepository } from 'test/repositories/in-memory-progress-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'

let app: INestApplication
let progressRepository: InMemoryProgressRepository
let ownershipGateway: {
  result: boolean
  validateOwnership: () => Promise<boolean>
}

const PROFILE_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('SaveProgressController', () => {
  beforeEach(async () => {
    ownershipGateway = {
      result: true,
      validateOwnership: async () => ownershipGateway.result,
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [SaveProgressController],
      providers: [
        SaveProgressUseCase,
        { provide: ProgressRepository, useClass: InMemoryProgressRepository },
        { provide: ProfileOwnershipGatewayPort, useValue: ownershipGateway },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    progressRepository = module.get(ProgressRepository)
  })

  it('should return 400 when tmdbId exceeds max allowed value', async () => {
    const response = await request(app.getHttpServer())
      .put(`/progress/${PROFILE_ID}`)
      .send({
        tmdbId: 100000000,
        type: 'movie',
        progressSeconds: 3600,
        durationSeconds: 8340,
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 200 when saving progress', async () => {
    const response = await request(app.getHttpServer())
      .put(`/progress/${PROFILE_ID}`)
      .send({
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 3600,
        durationSeconds: 8340,
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toBeNull()
    expect(progressRepository.items).toHaveLength(1)
  })

  it('should return 404 when user does not own the profile', async () => {
    ownershipGateway.result = false

    const response = await request(app.getHttpServer())
      .put(`/progress/${PROFILE_ID}`)
      .send({
        tmdbId: 550,
        type: 'movie',
        progressSeconds: 3600,
        durationSeconds: 8340,
      })

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })
})
