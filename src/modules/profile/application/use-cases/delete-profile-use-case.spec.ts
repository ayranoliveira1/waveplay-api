import { describe, it, expect, beforeEach } from 'vitest'

import { DeleteProfileUseCase } from './delete-profile-use-case'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { LastProfileError } from '../../domain/errors/last-profile.error'
import { Profile } from '../../domain/entities/profile'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let profilesRepository: InMemoryProfilesRepository
let sut: DeleteProfileUseCase

describe('DeleteProfileUseCase', () => {
  beforeEach(() => {
    profilesRepository = new InMemoryProfilesRepository()

    sut = new DeleteProfileUseCase(profilesRepository)
  })

  it('should delete a profile successfully', async () => {
    profilesRepository.items.push(
      Profile.create(
        { userId: 'user-1', name: 'Perfil 1' },
        new UniqueEntityID('profile-1'),
      ),
      Profile.create(
        { userId: 'user-1', name: 'Perfil 2' },
        new UniqueEntityID('profile-2'),
      ),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toBeNull()
    expect(profilesRepository.items).toHaveLength(1)
    expect(profilesRepository.items[0].id.toValue()).toBe('profile-2')
  })

  it('should return error when trying to delete the last profile', async () => {
    profilesRepository.items.push(
      Profile.create(
        { userId: 'user-1', name: 'Único Perfil' },
        new UniqueEntityID('profile-1'),
      ),
    )

    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'profile-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(LastProfileError)
    expect(profilesRepository.items).toHaveLength(1)
  })

  it('should return error when profile does not exist', async () => {
    const result = await sut.execute({
      userId: 'user-1',
      profileId: 'non-existent',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProfileNotFoundError)
  })

  it('should return error when user does not own the profile (IDOR protection)', async () => {
    profilesRepository.items.push(
      Profile.create(
        { userId: 'user-1', name: 'Perfil do User 1' },
        new UniqueEntityID('profile-1'),
      ),
      Profile.create(
        { userId: 'user-1', name: 'Perfil 2 do User 1' },
        new UniqueEntityID('profile-2'),
      ),
    )

    const result = await sut.execute({
      userId: 'user-2',
      profileId: 'profile-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ProfileNotFoundError)
    expect(profilesRepository.items).toHaveLength(2)
  })
})
