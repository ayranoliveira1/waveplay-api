import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common'

import { LogoutAllUseCase } from '../../application/use-cases/logout-all-use-case'
import { GetUser } from '../decorators/get-user.decorator'

@Controller('/auth')
export class LogoutAllController {
  constructor(private logoutAllUseCase: LogoutAllUseCase) {}

  @Post('/logout-all')
  @HttpCode(HttpStatus.OK)
  async handle(@GetUser('userId') userId: string) {
    const result = await this.logoutAllUseCase.execute({ userId })

    return { success: true, data: result.value, error: null }
  }
}
