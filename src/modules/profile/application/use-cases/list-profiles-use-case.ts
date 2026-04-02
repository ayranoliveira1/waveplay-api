import { Injectable } from '@nestjs/common'

import { Either, right } from '@/core/either'
import { Profile } from '../../domain/entities/profile'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { UserPlanGatewayPort } from '../ports/user-plan-gateway.port'

interface ListProfilesUseCaseRequest {
  userId: string
}

type ListProfilesUseCaseResponse = Either<
  never,
  { profiles: Profile[]; maxProfiles: number }
>

@Injectable()
export class ListProfilesUseCase {
  constructor(
    private profilesRepository: ProfilesRepository,
    private userPlanGateway: UserPlanGatewayPort,
  ) {}

  async execute(
    request: ListProfilesUseCaseRequest,
  ): Promise<ListProfilesUseCaseResponse> {
    const { userId } = request

    const [profiles, maxProfiles] = await Promise.all([
      this.profilesRepository.findManyByUserId(userId),
      this.userPlanGateway.getMaxProfiles(userId),
    ])

    return right({ profiles, maxProfiles })
  }
}
