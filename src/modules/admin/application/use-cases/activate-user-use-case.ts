import { Injectable, Logger } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { User } from '@/modules/identity/domain/entities/user'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'

interface ActivateUserRequest {
  userId: string
}

type ActivateUserResponse = Either<UserNotFoundError, { user: User }>

@Injectable()
export class ActivateUserUseCase {
  private readonly logger = new Logger(ActivateUserUseCase.name)

  constructor(private usersRepository: UsersRepository) {}

  async execute({
    userId,
  }: ActivateUserRequest): Promise<ActivateUserResponse> {
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      return left(new UserNotFoundError())
    }

    if (user.active) {
      return right({ user })
    }

    user.activate()
    await this.usersRepository.save(user)

    this.logger.log(`Admin activated user: ${userId}`)

    return right({ user })
  }
}
