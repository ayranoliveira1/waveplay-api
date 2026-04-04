import { Controller, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { z } from 'zod'

import { ClearHistoryUseCase } from '../../application/use-cases/clear-history-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'

const profileIdSchema = z.string().uuid()

@Controller('/history')
export class ClearHistoryController {
  constructor(private clearHistoryUseCase: ClearHistoryUseCase) {}

  @Delete(':profileId')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('profileId', new ZodValidationPipe(profileIdSchema))
    profileId: string,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.clearHistoryUseCase.execute({
      userId,
      profileId,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return { success: true, data: null, error: null }
  }
}
