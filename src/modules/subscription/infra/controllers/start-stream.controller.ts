import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { z } from 'zod'

import { StartStreamUseCase } from '../../application/use-cases/start-stream-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'

const startStreamSchema = z.object({
  profileId: z.string().uuid(),
  tmdbId: z.number().int().min(0),
  type: z.enum(['movie', 'series']),
})

type StartStreamBody = z.infer<typeof startStreamSchema>

@Controller('/streams')
export class StartStreamController {
  constructor(private startStreamUseCase: StartStreamUseCase) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async handle(
    @Body(new ZodValidationPipe(startStreamSchema)) body: StartStreamBody,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.startStreamUseCase.execute({
      userId,
      profileId: body.profileId,
      tmdbId: body.tmdbId,
      type: body.type,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: { streamId: result.value.streamId },
      error: null,
    }
  }
}
