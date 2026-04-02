import { Injectable } from '@nestjs/common'

import { Either, left, right } from '@/core/either'
import { Profile } from '../../domain/entities/profile'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { UserPlanGatewayPort } from '../ports/user-plan-gateway.port'
import { MaxProfilesReachedError } from '../../domain/errors/max-profiles-reached.error'

interface CreateProfileUseCaseRequest {
  userId: string
  name: string
  avatarUrl?: string
  isKid?: boolean
}

type CreateProfileUseCaseResponse = Either<
  MaxProfilesReachedError,
  { profile: Profile }
>

@Injectable()
export class CreateProfileUseCase {
  constructor(
    private profilesRepository: ProfilesRepository,
    private userPlanGateway: UserPlanGatewayPort,
  ) {}

  async execute(
    request: CreateProfileUseCaseRequest,
  ): Promise<CreateProfileUseCaseResponse> {
    const { userId, name, avatarUrl, isKid } = request

    const maxProfiles = await this.userPlanGateway.getMaxProfiles(userId)

    const profile = Profile.create({
      userId,
      name,
      avatarUrl: avatarUrl ?? null,
      isKid: isKid ?? false,
    })

    try {
      await this.profilesRepository.create(profile, maxProfiles)
    } catch (error) {
      if (error instanceof MaxProfilesReachedError) {
        return left(error)
      }
      throw error
    }

    return right({ profile })
  }
}
