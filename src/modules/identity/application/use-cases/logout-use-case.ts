import { Injectable, Logger } from '@nestjs/common'

import { Either, right } from '@/core/either'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'

interface LogoutUseCaseRequest {
  userId: string
  family: string
}

type LogoutUseCaseResponse = Either<never, { message: string }>

@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name)

  constructor(private refreshTokensRepository: RefreshTokensRepository) {}

  async execute(request: LogoutUseCaseRequest): Promise<LogoutUseCaseResponse> {
    const { userId, family } = request

    await this.refreshTokensRepository.revokeAllByFamily(family)

    this.logger.log(`Logout: user ${userId}, family ${family}`)

    return right({ message: 'Sessão encerrada com sucesso' })
  }
}
