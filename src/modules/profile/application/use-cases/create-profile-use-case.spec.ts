import { describe, it, expect, beforeEach } from 'vitest'

import { CreateProfileUseCase } from './create-profile-use-case'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { FakeUserPlanGateway } from 'test/ports/fake-user-plan-gateway'
import { MaxProfilesReachedError } from '../../domain/errors/max-profiles-reached.error'
import { Profile } from '../../domain/entities/profile'

let profilesRepository: InMemoryProfilesRepository
let userPlanGateway: FakeUserPlanGateway
let sut: CreateProfileUseCase

describe('CreateProfileUseCase', () => {
  beforeEach(() => {
    profilesRepository = new InMemoryProfilesRepository()
    userPlanGateway = new FakeUserPlanGateway()

    sut = new CreateProfileUseCase(profilesRepository, userPlanGateway)
  })

  it('should create a profile successfully', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      name: 'Meu Perfil',
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.profile).toBeInstanceOf(Profile)
      expect(result.value.profile.name).toBe('Meu Perfil')
      expect(result.value.profile.userId).toBe('user-1')
      expect(result.value.profile.isKid).toBe(false)
      expect(result.value.profile.avatarUrl).toBeNull()
    }

    expect(profilesRepository.items).toHaveLength(1)
  })

  it('should create a profile with optional fields', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      name: 'Perfil Kids',
      avatarUrl: 'https://example.com/avatar.png',
      isKid: true,
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.profile.avatarUrl).toBe(
        'https://example.com/avatar.png',
      )
      expect(result.value.profile.isKid).toBe(true)
    }
  })

  it('should block creation when profile limit is reached', async () => {
    userPlanGateway.maxProfiles = 1

    await sut.execute({ userId: 'user-1', name: 'Perfil 1' })

    const result = await sut.execute({ userId: 'user-1', name: 'Perfil 2' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(MaxProfilesReachedError)
    expect(profilesRepository.items).toHaveLength(1)
  })

  it('should respect plan limit of 3 profiles', async () => {
    userPlanGateway.maxProfiles = 3

    await sut.execute({ userId: 'user-1', name: 'Perfil 1' })
    await sut.execute({ userId: 'user-1', name: 'Perfil 2' })
    await sut.execute({ userId: 'user-1', name: 'Perfil 3' })

    const result = await sut.execute({ userId: 'user-1', name: 'Perfil 4' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(MaxProfilesReachedError)
    expect(profilesRepository.items).toHaveLength(3)
  })

  it('should allow different users to create profiles independently', async () => {
    userPlanGateway.maxProfiles = 1

    const result1 = await sut.execute({ userId: 'user-1', name: 'Perfil A' })
    const result2 = await sut.execute({ userId: 'user-2', name: 'Perfil B' })

    expect(result1.isRight()).toBe(true)
    expect(result2.isRight()).toBe(true)
    expect(profilesRepository.items).toHaveLength(2)
  })
})
