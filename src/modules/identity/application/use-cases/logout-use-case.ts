import { Injectable } from '@nestjs/common'

import { Either, right } from '@/core/either'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'

interface LogoutUseCaseRequest {
  family: string
}

type LogoutUseCaseResponse = Either<never, void>

@Injectable()
export class LogoutUseCase {
  constructor(private refreshTokensRepository: RefreshTokensRepository) {}

  async execute(request: LogoutUseCaseRequest): Promise<LogoutUseCaseResponse> {
    const { family } = request

    await this.refreshTokensRepository.revokeAllByFamily(family)

    return right(undefined)
  }
}
