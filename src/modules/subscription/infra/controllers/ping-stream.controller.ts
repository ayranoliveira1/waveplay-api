import {
  Controller,
  Put,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common'

import { PingStreamUseCase } from '../../application/use-cases/ping-stream-use-case'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'

@Controller('/streams')
export class PingStreamController {
  constructor(private pingStreamUseCase: PingStreamUseCase) {}

  @Put(':id/ping')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.pingStreamUseCase.execute({
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
