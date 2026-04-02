import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { DeleteProfileController } from './delete-profile.controller'
import { DeleteProfileUseCase } from '../../application/use-cases/delete-profile-use-case'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { Profile } from '../../domain/entities/profile'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let app: INestApplication
let profilesRepository: InMemoryProfilesRepository

describe('DeleteProfileController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [DeleteProfileController],
      providers: [
        DeleteProfileUseCase,
        { provide: ProfilesRepository, useClass: InMemoryProfilesRepository },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()

    profilesRepository = module.get(ProfilesRepository)
  })

  it('should return 200 with data: null on successful delete', async () => {
    profilesRepository.items.push(
      Profile.create(
        { userId: FakeAuthGuard.userId, name: 'Perfil 1' },
        new UniqueEntityID('profile-1'),
      ),
      Profile.create(
        { userId: FakeAuthGuard.userId, name: 'Perfil 2' },
        new UniqueEntityID('profile-2'),
      ),
    )

    const response = await request(app.getHttpServer()).delete(
      '/profiles/profile-1',
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toBeNull()
    expect(response.body.error).toBeNull()
    expect(profilesRepository.items).toHaveLength(1)
  })

  it('should return 404 when profile not found', async () => {
    const response = await request(app.getHttpServer()).delete(
      '/profiles/nonexistent-id',
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })

  it('should return 404 when profile belongs to another user (IDOR protection)', async () => {
    profilesRepository.items.push(
      Profile.create(
        { userId: 'other-user-id', name: 'Perfil do Outro' },
        new UniqueEntityID('other-profile'),
      ),
      Profile.create(
        { userId: 'other-user-id', name: 'Perfil 2 do Outro' },
        new UniqueEntityID('other-profile-2'),
      ),
    )

    const response = await request(app.getHttpServer()).delete(
      '/profiles/other-profile',
    )

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
    expect(profilesRepository.items).toHaveLength(2)
  })

  it('should return 403 when trying to delete last profile', async () => {
    profilesRepository.items.push(
      Profile.create(
        { userId: FakeAuthGuard.userId, name: 'Único Perfil' },
        new UniqueEntityID('profile-1'),
      ),
    )

    const response = await request(app.getHttpServer()).delete(
      '/profiles/profile-1',
    )

    expect(response.status).toBe(403)
    expect(response.body.success).toBe(false)
    expect(profilesRepository.items).toHaveLength(1)
  })
})
