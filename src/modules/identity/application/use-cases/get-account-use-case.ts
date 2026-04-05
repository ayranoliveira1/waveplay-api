import { Injectable } from '@nestjs/common'

import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/errors/resource-not-found-error'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { User } from '../../domain/entities/user'
import { AccountGatewayPort } from '../ports/account-gateway.port'
import type { AccountSubscriptionData } from '../ports/account-gateway.port'

interface GetAccountUseCaseRequest {
  userId: string
}

type GetAccountUseCaseResponse = Either<
  ResourceNotFoundError<{ userId: string }>,
  { user: User; subscription: AccountSubscriptionData | null }
>

@Injectable()
export class GetAccountUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private accountGateway: AccountGatewayPort,
  ) {}

  async execute(
    request: GetAccountUseCaseRequest,
  ): Promise<GetAccountUseCaseResponse> {
    const user = await this.usersRepository.findById(request.userId)

    if (!user) {
      return left(
        new ResourceNotFoundError({
          errors: [{ message: 'Usuário não encontrado' }],
        }),
      )
    }

    const subscription = await this.accountGateway.getSubscription(
      request.userId,
    )

    return right({ user, subscription })
  }
}
