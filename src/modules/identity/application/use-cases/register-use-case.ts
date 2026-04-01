import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import { Either, left, right } from '@/core/either'
import { User } from '../../domain/entities/user'
import { RefreshToken } from '../../domain/entities/refresh-token'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { HasherPort } from '../ports/hasher.port'
import { EncrypterPort } from '../ports/encrypter.port'
import { PlansGatewayPort } from '../ports/plans-gateway.port'
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error'
import { WeakPasswordError } from '../../domain/errors/weak-password.error'

interface RegisterUseCaseRequest {
  name: string
  email: string
  password: string
  ipAddress?: string
  userAgent?: string
}

type RegisterUseCaseResponse = Either<
  EmailAlreadyExistsError | WeakPasswordError,
  {
    user: User
    accessToken: string
    refreshToken: string
  }
>

const REFRESH_TOKEN_EXPIRY_MS = 48 * 60 * 60 * 1000 // 48h

@Injectable()
export class RegisterUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private hasher: HasherPort,
    private encrypter: EncrypterPort,
    private refreshTokensRepository: RefreshTokensRepository,
    private plansGateway: PlansGatewayPort,
  ) {}

  async execute(
    request: RegisterUseCaseRequest,
  ): Promise<RegisterUseCaseResponse> {
    const { name, email, password, ipAddress, userAgent } = request

    if (password.length < 8) {
      return left(new WeakPasswordError())
    }

    const existingUser = await this.usersRepository.findByEmail(email)

    if (existingUser) {
      return left(new EmailAlreadyExistsError())
    }

    const passwordHash = await this.hasher.hash(password)

    const plan = await this.plansGateway.findBySlug('basico')

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
      expiresInMs: REFRESH_TOKEN_EXPIRY_MS,
      ipAddress,
      userAgent,
    })

    await this.refreshTokensRepository.create(refreshToken)

    const accessToken = await this.encrypter.sign(
      { sub: user.id.toValue() },
      { expiresIn: '15m' },
    )

    return right({
      user,
      accessToken,
      refreshToken: rawToken,
    })
  }
}
