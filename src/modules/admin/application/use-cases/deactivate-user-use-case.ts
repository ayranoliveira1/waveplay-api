import { Injectable, Logger } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { User, UserRole } from '@/modules/identity/domain/entities/user'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { RefreshTokensRepository } from '@/modules/identity/domain/repositories/refresh-tokens-repository'
import { ActiveStreamsRepository } from '@/modules/subscription/domain/repositories/active-streams-repository'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'
import { CannotDeactivateAdminError } from '../../domain/errors/cannot-deactivate-admin.error'

interface DeactivateUserRequest {
  userId: string
}

type DeactivateUserResponse = Either<
  UserNotFoundError | CannotDeactivateAdminError,
  { user: User }
>

@Injectable()
export class DeactivateUserUseCase {
  private readonly logger = new Logger(DeactivateUserUseCase.name)

  constructor(
    private usersRepository: UsersRepository,
    private refreshTokensRepository: RefreshTokensRepository,
    private activeStreamsRepository: ActiveStreamsRepository,
  ) {}

  async execute({
    userId,
  }: DeactivateUserRequest): Promise<DeactivateUserResponse> {
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      return left(new UserNotFoundError())
    }

    if (user.role === UserRole.ADMIN) {
      return left(new CannotDeactivateAdminError())
    }

    if (!user.active) {
      return right({ user })
    }

    user.deactivate()
    await this.usersRepository.save(user)
    await this.refreshTokensRepository.revokeAllByUserId(userId)
    await this.activeStreamsRepository.deleteAllByUserId(userId)

    this.logger.log(`Admin deactivated user: ${userId}`)

    return right({ user })
  }
}
