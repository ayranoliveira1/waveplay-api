import { Controller, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common'

import { StopStreamUseCase } from '../../application/use-cases/stop-stream-use-case'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'

@Controller('/streams')
export class StopStreamController {
  constructor(private stopStreamUseCase: StopStreamUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id') id: string, @GetUser('userId') userId: string) {
    const result = await this.stopStreamUseCase.execute({
      userId,
      streamId: id,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: null,
      error: null,
    }
  }
}
