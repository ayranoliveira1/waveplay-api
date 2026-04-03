import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import { Either, left, right } from '@/core/either'
import { User } from '../../domain/entities/user'
import { RefreshToken } from '../../domain/entities/refresh-token'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../ports/hasher.port'
import { EncrypterPort } from '../ports/encrypter.port'
import { AccountLockoutPort } from '../ports/account-lockout.port'
import { AuthConfigPort } from '../ports/auth-config.port'
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error'
import { AccountLockedError } from '../../domain/errors/account-locked.error'

interface AuthenticateUseCaseRequest {
  email: string
  password: string
  ipAddress?: string
  userAgent?: string
}

type AuthenticateUseCaseResponse = Either<
  InvalidCredentialsError | AccountLockedError,
  {
    user: User
    accessToken: string
    refreshToken: string
  }
>

// Hash pré-computado para comparação quando email não existe (anti timing attack)
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$ovpepGBRktAz5t0vOnRe7w$C/QhQnB91cELg+YTYAhCCCHea/vYxSsq2tQoNpmQ9Ws'

@Injectable()
export class AuthenticateUseCase {
  private readonly logger = new Logger(AuthenticateUseCase.name)

  constructor(
    private usersRepository: UsersRepository,
    private hasher: HasherPort,
    private encrypter: EncrypterPort,
    private refreshTokensRepository: RefreshTokensRepository,
    private accountLockout: AccountLockoutPort,
    private authConfig: AuthConfigPort,
  ) {}

  async execute(
    request: AuthenticateUseCaseRequest,
  ): Promise<AuthenticateUseCaseResponse> {
    const { email, password, ipAddress, userAgent } = request

    const isLocked = await this.accountLockout.isLocked(email)

    if (isLocked) {
      this.logger.warn(`Account locked: ${email}`)
      return left(new AccountLockedError())
    }

    const user = await this.usersRepository.findByEmail(email)

    const passwordMatch = await this.hasher.compare(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    )

    if (!user || !passwordMatch) {
      await this.accountLockout.incrementFailures(email)
      this.logger.warn(`Failed login attempt: ${email}`)
      return left(new InvalidCredentialsError())
    }

    await this.accountLockout.resetFailures(email)

    const rawToken = randomUUID()
    const { refreshToken } = RefreshToken.createFromRawToken({
      rawToken,
      userId: user.id.toValue(),
      expiresInMs: this.authConfig.getRefreshTokenExpiresInMs(),
      ipAddress,
      userAgent,
    })

    await this.refreshTokensRepository.create(refreshToken)

    const accessToken = await this.encrypter.sign(
      { sub: user.id.toValue(), family: refreshToken.family },
      { expiresIn: this.authConfig.getAccessTokenExpiresIn() },
    )

    return right({
      user,
      accessToken,
      refreshToken: rawToken,
    })
  }
}
