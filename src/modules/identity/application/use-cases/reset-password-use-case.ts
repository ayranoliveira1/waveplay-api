import { Injectable, Logger } from '@nestjs/common'
import { createHash, timingSafeEqual } from 'node:crypto'

import { Either, left, right } from '@/core/either'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { PasswordResetTokensRepository } from '../../domain/repositories/password-reset-tokens-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../ports/hasher.port'
import { InvalidResetTokenError } from '../../domain/errors/invalid-reset-token.error'
import { WeakPasswordError } from '../../domain/errors/weak-password.error'

interface ResetPasswordUseCaseRequest {
  token: string
  newPassword: string
}

type ResetPasswordUseCaseResponse = Either<
  InvalidResetTokenError | WeakPasswordError,
  { message: string }
>

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name)

  constructor(
    private passwordResetTokensRepository: PasswordResetTokensRepository,
    private usersRepository: UsersRepository,
    private hasher: HasherPort,
    private refreshTokensRepository: RefreshTokensRepository,
  ) {}

  async execute(
    request: ResetPasswordUseCaseRequest,
  ): Promise<ResetPasswordUseCaseResponse> {
    const { token, newPassword } = request

    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/

    if (!PASSWORD_REGEX.test(newPassword)) {
      return left(new WeakPasswordError())
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')

    const storedToken =
      await this.passwordResetTokensRepository.findByTokenHash(tokenHash)

    if (!storedToken) {
      return left(new InvalidResetTokenError())
    }

    // Defense-in-depth: timing-safe comparison (security-checklist §15.6)
    const computedHashBuffer = Buffer.from(tokenHash, 'hex')
    const storedHashBuffer = Buffer.from(storedToken.tokenHash, 'hex')

    if (!timingSafeEqual(computedHashBuffer, storedHashBuffer)) {
      return left(new InvalidResetTokenError())
    }

    if (storedToken.isExpired()) {
      return left(new InvalidResetTokenError())
    }

    if (storedToken.isUsed()) {
      return left(new InvalidResetTokenError())
    }

    const passwordHash = await this.hasher.hash(newPassword)

    const user = await this.usersRepository.findById(storedToken.userId)

    if (!user) {
      return left(new InvalidResetTokenError())
    }

    user.passwordHash = passwordHash

    await this.usersRepository.save(user)

    await this.passwordResetTokensRepository.markAsUsed(tokenHash)

    await this.refreshTokensRepository.revokeAllByUserId(storedToken.userId)

    this.logger.log(`Password reset completed for user: ${storedToken.userId}`)

    return right({ message: 'Senha alterada com sucesso' })
  }
}
