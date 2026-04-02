import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import { Either, left, right } from '@/core/either'
import { User } from '../../domain/entities/user'
import { RefreshToken } from '../../domain/entities/refresh-token'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../ports/hasher.port'
import { EncrypterPort } from '../ports/encrypter.port'
import { PlansGatewayPort } from '../ports/plans-gateway.port'
import { AuthConfigPort } from '../ports/auth-config.port'
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error'
import { WeakPasswordError } from '../../domain/errors/weak-password.error'
import { PasswordMismatchError } from '../../domain/errors/password-mismatch.error'

interface RegisterUseCaseRequest {
  name: string
  email: string
  password: string
  confirmPassword: string
  ipAddress?: string
  userAgent?: string
}

type RegisterUseCaseResponse = Either<
  EmailAlreadyExistsError | WeakPasswordError | PasswordMismatchError,
  {
    user: User
    accessToken: string
    refreshToken: string
  }
>

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name)

  constructor(
    private usersRepository: UsersRepository,
    private hasher: HasherPort,
    private encrypter: EncrypterPort,
    private refreshTokensRepository: RefreshTokensRepository,
    private plansGateway: PlansGatewayPort,
    private authConfig: AuthConfigPort,
  ) {}

  async execute(
    request: RegisterUseCaseRequest,
  ): Promise<RegisterUseCaseResponse> {
    const { name, email, password, confirmPassword, ipAddress, userAgent } =
      request

    if (password !== confirmPassword) {
      return left(new PasswordMismatchError())
    }

    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

    if (!PASSWORD_REGEX.test(password)) {
      return left(new WeakPasswordError())
    }

    const existingUser = await this.usersRepository.findByEmail(email)

    if (existingUser) {
      this.logger.warn(`Registration attempt with existing email: ${email}`)
      return left(new EmailAlreadyExistsError())
    }

    const passwordHash = await this.hasher.hash(password)

    const plan = await this.plansGateway.findBySlug('basico')

    if (!plan) {
      this.logger.warn(
        'Default plan "basico" not found — user created without plan',
      )
    }

    const user = User.create({
      name,
      email,
      passwordHash,
      planId: plan?.id ?? null,
    })

    await this.usersRepository.create(user)

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

    this.logger.log(`User registered successfully: ${user.id.toValue()}`)

    return right({
      user,
      accessToken,
      refreshToken: rawToken,
    })
  }
}
