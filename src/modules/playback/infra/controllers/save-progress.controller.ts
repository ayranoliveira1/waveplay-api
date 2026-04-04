import {
  Controller,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { z } from 'zod'

import { SaveProgressUseCase } from '../../application/use-cases/save-progress-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'

const profileIdSchema = z.string().uuid()

const saveProgressSchema = z
  .object({
    tmdbId: z.number().int().min(1),
    type: z.enum(['movie', 'series']),
    season: z.number().int().min(1).optional(),
    episode: z.number().int().min(1).optional(),
    progressSeconds: z.number().int().min(0),
    durationSeconds: z.number().int().min(1),
  })
  .strict()

type SaveProgressBody = z.infer<typeof saveProgressSchema>

@Controller('/progress')
export class SaveProgressController {
  constructor(private saveProgressUseCase: SaveProgressUseCase) {}

  @Put(':profileId')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('profileId', new ZodValidationPipe(profileIdSchema))
    profileId: string,
    @Body(new ZodValidationPipe(saveProgressSchema)) body: SaveProgressBody,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.saveProgressUseCase.execute({
      userId,
      profileId,
      tmdbId: body.tmdbId,
      type: body.type,
      season: body.season ?? null,
      episode: body.episode ?? null,
      progressSeconds: body.progressSeconds,
      durationSeconds: body.durationSeconds,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return { success: true, data: null, error: null }
  }
}
