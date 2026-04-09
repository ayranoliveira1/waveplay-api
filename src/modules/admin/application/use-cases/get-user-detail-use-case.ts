import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'
import type { AdminUserDetail } from '../ports/admin-user-gateway.port'
import { AdminUserGatewayPort } from '../ports/admin-user-gateway.port'

interface GetUserDetailRequest {
  userId: string
}

type GetUserDetailResponse = Either<
  UserNotFoundError,
  { user: AdminUserDetail }
>

@Injectable()
export class GetUserDetailUseCase {
  constructor(private gateway: AdminUserGatewayPort) {}

  async execute({
    userId,
  }: GetUserDetailRequest): Promise<GetUserDetailResponse> {
    const user = await this.gateway.getUserDetail(userId)

    if (!user) {
      return left(new UserNotFoundError())
    }

    return right({ user })
  }
}
