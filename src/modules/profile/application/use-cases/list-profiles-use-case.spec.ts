import { describe, it, expect, beforeEach } from 'vitest'

import { ListProfilesUseCase } from './list-profiles-use-case'
import { InMemoryProfilesRepository } from 'test/repositories/in-memory-profiles-repository'
import { FakeUserPlanGateway } from 'test/ports/fake-user-plan-gateway'
import { Profile } from '../../domain/entities/profile'

let profilesRepository: InMemoryProfilesRepository
let userPlanGateway: FakeUserPlanGateway
let sut: ListProfilesUseCase

describe('ListProfilesUseCase', () => {
  beforeEach(() => {
    profilesRepository = new InMemoryProfilesRepository()
    userPlanGateway = new FakeUserPlanGateway()

    sut = new ListProfilesUseCase(profilesRepository, userPlanGateway)
  })

  it('should list profiles for a user', async () => {
    profilesRepository.items.push(
      Profile.create({ userId: 'user-1', name: 'Perfil 1' }),
      Profile.create({ userId: 'user-1', name: 'Perfil 2' }),
    )

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    expect(result.value.profiles).toHaveLength(2)
    expect(result.value.profiles[0].name).toBe('Perfil 1')
    expect(result.value.profiles[1].name).toBe('Perfil 2')
  })

  it('should return maxProfiles from user plan', async () => {
    userPlanGateway.maxProfiles = 5

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    expect(result.value.maxProfiles).toBe(5)
  })

  it('should return empty array when user has no profiles', async () => {
    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    expect(result.value.profiles).toHaveLength(0)
  })

  it('should only return profiles belonging to the user', async () => {
    profilesRepository.items.push(
      Profile.create({ userId: 'user-1', name: 'Perfil do User 1' }),
      Profile.create({ userId: 'user-2', name: 'Perfil do User 2' }),
    )

    const result = await sut.execute({ userId: 'user-1' })

    expect(result.isRight()).toBe(true)
    expect(result.value.profiles).toHaveLength(1)
    expect(result.value.profiles[0].name).toBe('Perfil do User 1')
  })
})
