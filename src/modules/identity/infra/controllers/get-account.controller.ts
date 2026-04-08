import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

import { GetAccountUseCase } from '../../application/use-cases/get-account-use-case'
import { GetUser } from '../decorators/get-user.decorator'
import { AccountPresenter } from '../presenters/account-presenter'
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
        user: AccountPresenter.toHTTP(user, subscription),
      },
      error: null,
    }
  }
}
