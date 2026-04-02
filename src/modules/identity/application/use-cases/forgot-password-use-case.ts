import { Injectable, Logger } from '@nestjs/common'
import { randomBytes } from 'node:crypto'

import { Either, right } from '@/core/either'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { PasswordResetTokensRepository } from '../../domain/repositories/password-reset-tokens-repository'
import { PasswordResetToken } from '../../domain/entities/password-reset-token'

interface ForgotPasswordUseCaseRequest {
  email: string
}

type ForgotPasswordUseCaseResponse = Either<never, { message: string }>

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutos

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name)

  constructor(
    private usersRepository: UsersRepository,
    private passwordResetTokensRepository: PasswordResetTokensRepository,
  ) {}

  async execute(
    request: ForgotPasswordUseCaseRequest,
  ): Promise<ForgotPasswordUseCaseResponse> {
    const { email } = request

    const user = await this.usersRepository.findByEmail(email)

    // Sempre retorna sucesso — não expor se email existe (anti-enumeration)
    if (!user) {
      return right({
        message: 'Se o email existir, um link de recuperação foi enviado',
      })
    }

    const rawToken = randomBytes(32).toString('hex')

    const { passwordResetToken } = PasswordResetToken.createFromRawToken({
      rawToken,
      userId: user.id.toValue(),
      expiresInMs: RESET_TOKEN_TTL_MS,
    })

    await this.passwordResetTokensRepository.create(passwordResetToken)

    this.logger.log(
      `Password reset requested for user: ${user.id.toValue()}`,
    )

    // TODO: enviar email com rawToken (futuro)

    return right({
      message: 'Se o email existir, um link de recuperação foi enviado',
    })
  }
}
