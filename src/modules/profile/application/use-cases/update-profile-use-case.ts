import { Injectable } from '@nestjs/common'

import { Either, left, right } from '@/core/either'
import { Profile } from '../../domain/entities/profile'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'

interface UpdateProfileUseCaseRequest {
  userId: string
  profileId: string
  name?: string
  avatarUrl?: string
  isKid?: boolean
}

type UpdateProfileUseCaseResponse = Either<
  ProfileNotFoundError,
  { profile: Profile }
>

@Injectable()
export class UpdateProfileUseCase {
  constructor(private profilesRepository: ProfilesRepository) {}

  async execute(
    request: UpdateProfileUseCaseRequest,
  ): Promise<UpdateProfileUseCaseResponse> {
    const { userId, profileId, name, avatarUrl, isKid } = request

    const profile = await this.profilesRepository.findById(profileId)

    if (!profile) {
      return left(new ProfileNotFoundError())
    }

    if (profile.userId !== userId) {
      return left(new ProfileNotFoundError())
    }

    if (name !== undefined) {
      profile.name = name
    }

    if (avatarUrl !== undefined) {
      profile.avatarUrl = avatarUrl
    }

    if (isKid !== undefined) {
      profile.isKid = isKid
    }

    await this.profilesRepository.save(profile)

    return right({ profile })
  }
}
