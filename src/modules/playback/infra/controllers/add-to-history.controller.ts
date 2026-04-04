import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { z } from 'zod'

import { AddToHistoryUseCase } from '../../application/use-cases/add-to-history-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'

const profileIdSchema = z.string().uuid()

const addToHistorySchema = z
  .object({
    tmdbId: z.number().int().min(1),
    type: z.enum(['movie', 'series']),
    title: z.string().min(1),
    posterPath: z.string().nullable().optional(),
    season: z.number().int().min(1).optional(),
    episode: z.number().int().min(1).optional(),
    progressSeconds: z.number().int().min(0).optional(),
    durationSeconds: z.number().int().min(1).optional(),
  })
  .strict()

type AddToHistoryBody = z.infer<typeof addToHistorySchema>

@Controller('/history')
export class AddToHistoryController {
  constructor(private addToHistoryUseCase: AddToHistoryUseCase) {}

  @Post(':profileId')
  @HttpCode(HttpStatus.CREATED)
  async handle(
    @Param('profileId', new ZodValidationPipe(profileIdSchema))
    profileId: string,
    @Body(new ZodValidationPipe(addToHistorySchema)) body: AddToHistoryBody,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.addToHistoryUseCase.execute({
      userId,
      profileId,
      tmdbId: body.tmdbId,
      type: body.type,
      title: body.title,
      posterPath: body.posterPath ?? null,
      season: body.season ?? null,
      episode: body.episode ?? null,
      progressSeconds: body.progressSeconds ?? null,
      durationSeconds: body.durationSeconds ?? null,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return { success: true, data: null, error: null }
  }
}
