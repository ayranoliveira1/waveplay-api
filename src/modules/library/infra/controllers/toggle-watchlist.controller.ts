import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { z } from 'zod'

import { ToggleWatchlistUseCase } from '../../application/use-cases/toggle-watchlist-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'

const profileIdSchema = z.string().uuid()

const toggleWatchlistSchema = z
  .object({
    tmdbId: z.number().int().min(0),
    type: z.enum(['movie', 'series']),
    title: z.string().min(1),
    posterPath: z.string().nullable().optional(),
    backdropPath: z.string().nullable().optional(),
    rating: z.number().min(0).max(10),
  })
  .strict()

type ToggleWatchlistBody = z.infer<typeof toggleWatchlistSchema>

@Controller('/watchlist')
export class ToggleWatchlistController {
  constructor(private toggleWatchlistUseCase: ToggleWatchlistUseCase) {}

  @Post(':profileId')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('profileId', new ZodValidationPipe(profileIdSchema))
    profileId: string,
    @Body(new ZodValidationPipe(toggleWatchlistSchema))
    body: ToggleWatchlistBody,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.toggleWatchlistUseCase.execute({
      userId,
      profileId,
      tmdbId: body.tmdbId,
      type: body.type,
      title: body.title,
      posterPath: body.posterPath ?? null,
      backdropPath: body.backdropPath ?? null,
      rating: body.rating,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return { success: true, data: result.value, error: null }
  }
}
