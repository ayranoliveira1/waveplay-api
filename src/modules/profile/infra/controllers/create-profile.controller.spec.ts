import { describe, it, expect, beforeEach } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { CreateProfileController } from './create-profile.controller'
import { CreateProfileUseCase } from '../../application/use-cases/create-profile-use-case'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { UserPlanGatewayPort } from '../../application/ports/user-plan-gateway.port'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { FakeUserPlanGateway } from 'test/ports/fake-user-plan-gateway'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { Profile } from '../../domain/entities/profile'

let app: INestApplication
let profilesRepository: InMemoryProfilesRepository
let userPlanGateway: FakeUserPlanGateway

describe('CreateProfileController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [CreateProfileController],
      providers: [
        CreateProfileUseCase,
        { provide: ProfilesRepository, useClass: InMemoryProfilesRepository },
        { provide: UserPlanGatewayPort, useClass: FakeUserPlanGateway },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    profilesRepository = module.get(ProfilesRepository)
    userPlanGateway = module.get(UserPlanGatewayPort)
  })

  it('should return 201 with created profile', async () => {
    const response = await request(app.getHttpServer())
      .post('/profiles')
      .send({ name: 'Meu Perfil' })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.profile.name).toBe('Meu Perfil')
    expect(response.body.data.profile.id).toBeDefined()
    expect(response.body.data.profile.isKid).toBe(false)
    expect(response.body.data.profile.avatarUrl).toBeNull()
    expect(response.body.data.profile.createdAt).toBeDefined()
    expect(response.body.error).toBeNull()

    // Não deve expor userId
    expect(response.body.data.profile.userId).toBeUndefined()
  })

  it('should return 400 when name is empty', async () => {
    const response = await request(app.getHttpServer())
      .post('/profiles')
      .send({ name: '' })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
  })

  it('should return 403 when profile limit is reached', async () => {
    userPlanGateway.maxProfiles = 1

    profilesRepository.items.push(
      Profile.create({ userId: FakeAuthGuard.userId, name: 'Perfil 1' }),
    )

    const response = await request(app.getHttpServer())
      .post('/profiles')
      .send({ name: 'Segundo Perfil' })

    expect(response.status).toBe(403)
    expect(response.body.success).toBe(false)
  })

  it('should create profile with optional fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/profiles')
      .send({
        name: 'Perfil Kids',
        avatarUrl: 'https://example.com/avatar.png',
        isKid: true,
      })

    expect(response.status).toBe(201)
    expect(response.body.data.profile.avatarUrl).toBe(
      'https://example.com/avatar.png',
    )
    expect(response.body.data.profile.isKid).toBe(true)
  })
})
