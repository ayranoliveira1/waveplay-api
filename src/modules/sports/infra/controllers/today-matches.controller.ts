import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

import { GetLiveBroadcastsUseCase } from '../../application/use-cases/get-live-broadcasts-use-case'

@Controller('/sports')
export class TodayMatchesController {
  constructor(private getLiveBroadcastsUseCase: GetLiveBroadcastsUseCase) {}

  @Get('matches/today')
  @HttpCode(HttpStatus.OK)
  async handle() {
    const result = await this.getLiveBroadcastsUseCase.execute()
    return { success: true, data: result.value, error: null }
  }
}
