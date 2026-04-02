import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common'

import { LogoutUseCase } from '../../application/use-cases/logout-use-case'
import { GetUser } from '../decorators/get-user.decorator'
import type { UserPayload } from '../decorators/get-user.decorator'

@Controller('/auth')
export class LogoutController {
  constructor(private logoutUseCase: LogoutUseCase) {}

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  async handle(@GetUser() user: UserPayload) {
    const result = await this.logoutUseCase.execute({
      userId: user.userId,
      family: user.family,
    })

    return { success: true, data: result.value, error: null }
  }
}
