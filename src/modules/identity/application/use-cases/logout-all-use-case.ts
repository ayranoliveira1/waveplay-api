import { Injectable } from '@nestjs/common'

import { Either, right } from '@/core/either'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'

interface LogoutAllUseCaseRequest {
  userId: string
}

type LogoutAllUseCaseResponse = Either<never, void>

@Injectable()
export class LogoutAllUseCase {
  constructor(private refreshTokensRepository: RefreshTokensRepository) {}

  async execute(
    request: LogoutAllUseCaseRequest,
  ): Promise<LogoutAllUseCaseResponse> {
    const { userId } = request

    await this.refreshTokensRepository.revokeAllByUserId(userId)

    return right(undefined)
  }
}
