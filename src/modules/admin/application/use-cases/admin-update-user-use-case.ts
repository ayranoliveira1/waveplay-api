import { Injectable, Logger } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { User } from '@/modules/identity/domain/entities/user'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { EmailAlreadyExistsError } from '@/modules/identity/domain/errors/email-already-exists.error'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'

interface AdminUpdateUserRequest {
  userId: string
  name?: string
  email?: string
}

type AdminUpdateUserResponse = Either<
  UserNotFoundError | EmailAlreadyExistsError,
  { user: User }
>

@Injectable()
export class AdminUpdateUserUseCase {
  private readonly logger = new Logger(AdminUpdateUserUseCase.name)

  constructor(private usersRepository: UsersRepository) {}

  async execute({
    userId,
    name,
    email,
  }: AdminUpdateUserRequest): Promise<AdminUpdateUserResponse> {
    const user = await this.usersRepository.findById(userId)
    if (!user) {
      return left(new UserNotFoundError())
    }

    if (email && email !== user.email) {
      const existing = await this.usersRepository.findByEmail(email)
      if (existing && existing.id.toValue() !== user.id.toValue()) {
        return left(new EmailAlreadyExistsError())
      }
      user.email = email
    }

    if (name) {
      user.name = name
    }

    await this.usersRepository.save(user)

    this.logger.log(`Admin updated user: ${user.id.toValue()}`)

    return right({ user })
  }
}
