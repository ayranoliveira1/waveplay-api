import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { z } from 'zod'

import { StartStreamUseCase } from '../../application/use-cases/start-stream-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'
import { MaxStreamsReachedWithListError } from '../../domain/errors/max-streams-reached-with-list.error'
import { ActiveStreamPresenter } from '../presenters/active-stream-presenter'

const startStreamSchema = z.object({
  profileId: z.string().uuid(),
  tmdbId: z.number().int().min(0),
  type: z.enum(['movie', 'series']),
  title: z.string().min(1),
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
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.startStreamUseCase.execute({
      userId,
      profileId: body.profileId,
      tmdbId: body.tmdbId,
      type: body.type,
      title: body.title,
    })

    if (result.isLeft()) {
      const error = result.value

      if (error instanceof MaxStreamsReachedWithListError) {
        res.status(409)
        return {
          success: false,
          error: {
            statusCode: 409,
            code: 'MAX_STREAMS_REACHED',
            message: error.props.errors[0].message,
            maxStreams: error.maxStreams,
            activeStreams: ActiveStreamPresenter.toHTTP(error.activeStreams),
          },
        }
      }

      throw new CustomHttpException(error)
    }

    return {
      success: true,
      data: { streamId: result.value.streamId },
      error: null,
    }
  }
}
