import { Injectable, Logger } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { UserRole } from '@/modules/identity/domain/entities/user'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'
import { CannotDeleteAdminError } from '../../domain/errors/cannot-delete-admin.error'
import { UserStillActiveError } from '../../domain/errors/user-still-active.error'

interface DeleteUserRequest {
  userId: string
}

type DeleteUserResponse = Either<
  UserNotFoundError | CannotDeleteAdminError | UserStillActiveError,
  { deleted: true }
>

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name)

  constructor(private usersRepository: UsersRepository) {}

  async execute({ userId }: DeleteUserRequest): Promise<DeleteUserResponse> {
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      return left(new UserNotFoundError())
    }

    if (user.role === UserRole.ADMIN) {
      return left(new CannotDeleteAdminError())
    }

    if (user.active) {
      return left(new UserStillActiveError())
    }

    await this.usersRepository.delete(userId)

    this.logger.log(`Admin hard-deleted user: ${userId}`)

    return right({ deleted: true })
  }
}
