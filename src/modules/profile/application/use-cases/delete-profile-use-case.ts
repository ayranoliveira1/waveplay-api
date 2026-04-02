import { Injectable } from '@nestjs/common'

import { Either, left, right } from '@/core/either'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error'
import { LastProfileError } from '../../domain/errors/last-profile.error'

interface DeleteProfileUseCaseRequest {
  userId: string
  profileId: string
}

type DeleteProfileUseCaseResponse = Either<
  ProfileNotFoundError | LastProfileError,
  null
>

@Injectable()
export class DeleteProfileUseCase {
  constructor(private profilesRepository: ProfilesRepository) {}

  async execute(
    request: DeleteProfileUseCaseRequest,
  ): Promise<DeleteProfileUseCaseResponse> {
    const { userId, profileId } = request

    const profile = await this.profilesRepository.findById(profileId)

    if (!profile) {
      return left(new ProfileNotFoundError())
    }

    if (profile.userId !== userId) {
      return left(new ProfileNotFoundError())
    }

    const count = await this.profilesRepository.countByUserId(userId)

    if (count <= 1) {
      return left(new LastProfileError())
    }

    await this.profilesRepository.delete(profileId)

    return right(null)
  }
}
