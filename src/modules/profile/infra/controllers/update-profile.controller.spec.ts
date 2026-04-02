import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { UpdateProfileController } from './update-profile.controller'
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile-use-case'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { Profile } from '../../domain/entities/profile'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let app: INestApplication
let profilesRepository: InMemoryProfilesRepository

describe('UpdateProfileController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [UpdateProfileController],
      providers: [
        UpdateProfileUseCase,
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

  it('should return 200 with updated profile', async () => {
    profilesRepository.items.push(
      Profile.create(
        { userId: FakeAuthGuard.userId, name: 'Original' },
        new UniqueEntityID('profile-1'),
      ),
    )

    const response = await request(app.getHttpServer())
      .patch('/profiles/profile-1')
      .send({ name: 'Atualizado' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.profile.name).toBe('Atualizado')
    expect(response.body.error).toBeNull()
  })

  it('should update only provided fields (partial update)', async () => {
    profilesRepository.items.push(
      Profile.create(
        {
          userId: FakeAuthGuard.userId,
          name: 'Original',
          isKid: false,
          avatarUrl: 'https://example.com/old.png',
        },
        new UniqueEntityID('profile-1'),
      ),
    )

    const response = await request(app.getHttpServer())
      .patch('/profiles/profile-1')
      .send({ isKid: true })

    expect(response.status).toBe(200)
    expect(response.body.data.profile.isKid).toBe(true)
    expect(response.body.data.profile.name).toBe('Original')
    expect(response.body.data.profile.avatarUrl).toBe(
      'https://example.com/old.png',
    )
  })

  it('should return 404 when profile not found', async () => {
    const response = await request(app.getHttpServer())
      .patch('/profiles/nonexistent-id')
      .send({ name: 'Test' })

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
  })

  it('should return 404 when profile belongs to another user (IDOR protection)', async () => {
    profilesRepository.items.push(
      Profile.create(
        { userId: 'other-user-id', name: 'Perfil do Outro' },
        new UniqueEntityID('other-profile'),
      ),
    )

    const response = await request(app.getHttpServer())
      .patch('/profiles/other-profile')
      .send({ name: 'Hackeado' })

    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)

    // Perfil não deve ter sido alterado
    expect(profilesRepository.items[0].name).toBe('Perfil do Outro')
  })
})
