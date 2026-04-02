import { Injectable, Logger } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'

import { Either, left, right } from '@/core/either'
import { RefreshToken } from '../../domain/entities/refresh-token'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { EncrypterPort } from '../ports/encrypter.port'
import { AuthConfigPort } from '../ports/auth-config.port'
import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error'
import { TokenTheftDetectedError } from '../../domain/errors/token-theft-detected.error'

interface RefreshTokenUseCaseRequest {
  refreshToken: string
  ipAddress?: string
  userAgent?: string
}

type RefreshTokenUseCaseResponse = Either<
  InvalidRefreshTokenError | TokenTheftDetectedError,
  {
    accessToken: string
    refreshToken: string
  }
>

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name)

  constructor(
    private refreshTokensRepository: RefreshTokensRepository,
    private encrypter: EncrypterPort,
    private authConfig: AuthConfigPort,
  ) {}

  async execute(
    request: RefreshTokenUseCaseRequest,
  ): Promise<RefreshTokenUseCaseResponse> {
    const { refreshToken: rawToken, ipAddress, userAgent } = request

    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    const storedToken =
      await this.refreshTokensRepository.findByTokenHash(tokenHash)

    if (!storedToken) {
      return left(new InvalidRefreshTokenError())
    }

    // Detecção de roubo: token já foi revogado mas alguém está tentando usá-lo
    if (storedToken.isRevoked()) {
      await this.refreshTokensRepository.revokeAllByFamily(storedToken.family)
      this.logger.warn(
        `Token theft detected for family: ${storedToken.family}`,
      )
      return left(new TokenTheftDetectedError())
    }

    if (storedToken.isExpired()) {
      return left(new InvalidRefreshTokenError())
    }

    // Revoga o token atual (single-use)
    await this.refreshTokensRepository.revokeByTokenHash(tokenHash)

    // Gera novo refresh token com a mesma family
    const newRawToken = randomUUID()
    const { refreshToken: newToken } = RefreshToken.createFromRawToken({
      rawToken: newRawToken,
      userId: storedToken.userId,
      expiresInMs: this.authConfig.getRefreshTokenExpiresInMs(),
      family: storedToken.family,
      ipAddress,
      userAgent,
    })

    await this.refreshTokensRepository.create(newToken)

    const accessToken = await this.encrypter.sign(
      { sub: storedToken.userId },
      { expiresIn: this.authConfig.getAccessTokenExpiresIn() },
    )

    return right({
      accessToken,
      refreshToken: newRawToken,
    })
  }
}
