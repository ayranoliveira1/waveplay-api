import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { ListProfilesController } from './list-profiles.controller'
import { ListProfilesUseCase } from '../../application/use-cases/list-profiles-use-case'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { UserPlanGatewayPort } from '../../application/ports/user-plan-gateway.port'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { FakeUserPlanGateway } from 'test/ports/fake-user-plan-gateway'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { Profile } from '../../domain/entities/profile'

let app: INestApplication
let profilesRepository: InMemoryProfilesRepository

describe('ListProfilesController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [ListProfilesController],
      providers: [
        ListProfilesUseCase,
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
  })

  it('should return 200 with profiles and maxProfiles', async () => {
    profilesRepository.items.push(
      Profile.create({ userId: FakeAuthGuard.userId, name: 'Perfil 1' }),
      Profile.create({ userId: FakeAuthGuard.userId, name: 'Perfil 2' }),
    )

    const response = await request(app.getHttpServer()).get('/profiles')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.profiles).toHaveLength(2)
    expect(response.body.data.maxProfiles).toBe(3)
    expect(response.body.error).toBeNull()

    // Não deve expor userId no presenter
    expect(response.body.data.profiles[0].userId).toBeUndefined()
  })

  it('should return empty profiles when user has none', async () => {
    const response = await request(app.getHttpServer()).get('/profiles')

    expect(response.status).toBe(200)
    expect(response.body.data.profiles).toHaveLength(0)
    expect(response.body.data.maxProfiles).toBe(3)
  })

  it('should only return profiles of the authenticated user', async () => {
    profilesRepository.items.push(
      Profile.create({ userId: FakeAuthGuard.userId, name: 'Meu Perfil' }),
      Profile.create({ userId: 'other-user-id', name: 'Perfil do Outro' }),
    )

    const response = await request(app.getHttpServer()).get('/profiles')

    expect(response.status).toBe(200)
    expect(response.body.data.profiles).toHaveLength(1)
    expect(response.body.data.profiles[0].name).toBe('Meu Perfil')
  })
})
