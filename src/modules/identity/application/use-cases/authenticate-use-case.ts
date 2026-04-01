import { Injectable, Logger } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import { uuidv7 } from 'uuidv7'

import { Either, left, right } from '@/core/either'
import { User } from '../../domain/entities/user'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../ports/hasher.port'
import { EncrypterPort } from '../ports/encrypter.port'
import { AccountLockoutPort } from '../ports/account-lockout.port'
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

@Injectable()
export class AuthenticateUseCase {
  private readonly logger = new Logger(AuthenticateUseCase.name)

  constructor(
    private usersRepository: UsersRepository,
    private hasher: HasherPort,
    private encrypter: EncrypterPort,
    private refreshTokensRepository: RefreshTokensRepository,
    private accountLockout: AccountLockoutPort,
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

    if (!user) {
      await this.accountLockout.incrementFailures(email)
      this.logger.warn(`Failed login attempt: ${email}`)
      return left(new InvalidCredentialsError())
    }

    const passwordMatch = await this.hasher.compare(
      password,
      user.passwordHash,
    )

    if (!passwordMatch) {
      await this.accountLockout.incrementFailures(email)
      this.logger.warn(`Failed login attempt: ${email}`)
      return left(new InvalidCredentialsError())
    }

    await this.accountLockout.resetFailures(email)

    const rawRefreshToken = randomUUID()
    const tokenHash = createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex')
    const family = randomUUID()

    await this.refreshTokensRepository.create({
      id: uuidv7(),
      userId: user.id.toValue(),
      tokenHash,
      family,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      revokedAt: null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      createdAt: new Date(),
    })

    const accessToken = await this.encrypter.sign(
      { sub: user.id.toValue() },
      { expiresIn: '15m' },
    )

    return right({
      user,
      accessToken,
      refreshToken: rawRefreshToken,
    })
  }
}
