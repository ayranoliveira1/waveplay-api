import { Injectable, Logger } from '@nestjs/common'

import { Either, left, right } from '@/core/either'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../ports/hasher.port'
import { WeakPasswordError } from '../../domain/errors/weak-password.error'
import { InvalidCurrentPasswordError } from '../../domain/errors/invalid-current-password.error'
import { SamePasswordError } from '../../domain/errors/same-password.error'
import { UserNotFoundError } from '../../domain/errors/user-not-found.error'

interface ChangePasswordUseCaseRequest {
  userId: string
  currentPassword: string
  newPassword: string
}

type ChangePasswordUseCaseResponse = Either<
  | UserNotFoundError
  | InvalidCurrentPasswordError
  | WeakPasswordError
  | SamePasswordError,
  { message: string }
>

@Injectable()
export class ChangePasswordUseCase {
  private readonly logger = new Logger(ChangePasswordUseCase.name)

  constructor(
    private usersRepository: UsersRepository,
    private hasher: HasherPort,
    private refreshTokensRepository: RefreshTokensRepository,
  ) {}

  async execute(
    request: ChangePasswordUseCaseRequest,
  ): Promise<ChangePasswordUseCaseResponse> {
    const { userId, currentPassword, newPassword } = request

    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/

    if (!PASSWORD_REGEX.test(newPassword)) {
      return left(new WeakPasswordError())
    }

    const user = await this.usersRepository.findById(userId)

    if (!user) {
      return left(new UserNotFoundError())
    }

    const currentMatches = await this.hasher.compare(
      currentPassword,
      user.passwordHash,
    )

    if (!currentMatches) {
      return left(new InvalidCurrentPasswordError())
    }

    if (newPassword === currentPassword) {
      return left(new SamePasswordError())
    }

    user.passwordHash = await this.hasher.hash(newPassword)

    await this.usersRepository.save(user)

    await this.refreshTokensRepository.revokeAllByUserId(userId)

    this.logger.log(`Password changed for user: ${userId}`)

    return right({ message: 'Senha alterada com sucesso' })
  }
}
