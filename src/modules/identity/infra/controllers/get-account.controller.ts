import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

import { GetAccountUseCase } from '../../application/use-cases/get-account-use-case'
import { GetUser } from '../decorators/get-user.decorator'
import { UserPresenter } from '../presenters/user-presenter'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

@Controller('/account')
export class GetAccountController {
  constructor(private getAccountUseCase: GetAccountUseCase) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async handle(@GetUser('userId') userId: string) {
    const result = await this.getAccountUseCase.execute({ userId })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    const { user, subscription } = result.value

    return {
      success: true,
      data: {
        user: {
          ...UserPresenter.toHTTP(user),
          subscription: subscription
            ? {
                id: subscription.id,
                status: subscription.status,
                startedAt: subscription.startedAt,
                endsAt: subscription.endsAt,
                plan: subscription.plan,
              }
            : null,
        },
      },
      error: null,
    }
  }
}
