import { Injectable, Logger } from '@nestjs/common'

import { Either, right } from '@/core/either'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'

interface LogoutAllUseCaseRequest {
  userId: string
}

type LogoutAllUseCaseResponse = Either<never, { message: string }>

@Injectable()
export class LogoutAllUseCase {
  private readonly logger = new Logger(LogoutAllUseCase.name)

  constructor(private refreshTokensRepository: RefreshTokensRepository) {}

  async execute(
    request: LogoutAllUseCaseRequest,
  ): Promise<LogoutAllUseCaseResponse> {
    const { userId } = request

    await this.refreshTokensRepository.revokeAllByUserId(userId)

    this.logger.log(`Logout-all: user ${userId}`)

    return right({ message: 'Todas as sessões encerradas com sucesso' })
  }
}
