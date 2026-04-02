import { describe, it, expect, beforeEach } from 'vitest'

import { UpdateProfileUseCase } from './update-profile-use-case'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { Profile } from '../../domain/entities/profile'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let profilesRepository: InMemoryProfilesRepository
let sut: UpdateProfileUseCase

describe('UpdateProfileUseCase', () => {
  beforeEach(() => {
    profilesRepository = new InMemoryProfilesRepository()

    sut = new UpdateProfileUseCase(profilesRepository)
  })

  it('should update a profile successfully', async () => {
    const profile = Profile.create(
      { userId: 'user-1', name: 'Nome Antigo' },
      new UniqueEntityID('profile-1'),
    )
    profilesRepository.items.push(profile)

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      name: 'Nome Novo',
      avatarUrl: 'https://example.com/avatar.png',
      isKid: true,
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.profile.name).toBe('Nome Novo')
      expect(result.value.profile.avatarUrl).toBe(
        'https://example.com/avatar.png',
      )
      expect(result.value.profile.isKid).toBe(true)
    }
  })

  it('should update only provided fields', async () => {
    const profile = Profile.create(
      {
        userId: 'user-1',
        name: 'Nome Original',
        avatarUrl: 'https://example.com/old.png',
        isKid: false,
      },
      new UniqueEntityID('profile-1'),
    )
    profilesRepository.items.push(profile)

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
      name: 'Nome Atualizado',
    })

    expect(result.isRight()).toBe(true)

    if (result.isRight()) {
      expect(result.value.profile.name).toBe('Nome Atualizado')
      expect(result.value.profile.avatarUrl).toBe(
        'https://example.com/old.png',
      )
      expect(result.value.profile.isKid).toBe(false)
    }
  })

  it('should return error when profile does not exist', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'non-existent',
      name: 'Novo Nome',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProfileNotFoundError)
  })

  it('should return error when user does not own the profile (IDOR protection)', async () => {
    const profile = Profile.create(
      { userId: 'user-1', name: 'Perfil do User 1' },
      new UniqueEntityID('profile-1'),
    )
    profilesRepository.items.push(profile)

    const result = await sut.execute({
      userId: 'user-2',
      profileId: 'profile-1',
      name: 'Tentativa de Alteração',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProfileNotFoundError)

    // Verifica que o perfil não foi alterado
    expect(profilesRepository.items[0].name).toBe('Perfil do User 1')
  })
})
