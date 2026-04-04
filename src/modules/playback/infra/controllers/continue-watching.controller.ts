import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { z } from 'zod'

import { GetContinueWatchingUseCase } from '../../application/use-cases/get-continue-watching-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'
import { ProgressPresenter } from '../presenters/progress-presenter'

const profileIdSchema = z.string().uuid()

@Controller('/progress')
export class ContinueWatchingController {
  constructor(private getContinueWatchingUseCase: GetContinueWatchingUseCase) {}

  @Get(':profileId/continue')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('profileId', new ZodValidationPipe(profileIdSchema))
    profileId: string,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.getContinueWatchingUseCase.execute({
      userId,
      profileId,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: {
        items: result.value.items.map(ProgressPresenter.toHTTP),
      },
      error: null,
    }
  }
}
