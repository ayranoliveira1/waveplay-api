import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { z } from 'zod'

import { GetSeasonEpisodesUseCase } from '../../application/use-cases/get-season-episodes-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { SeriesPresenter } from '../presenters/series-presenter'

const idSchema = z.string().transform(Number).pipe(z.number().int().min(1))
const seasonSchema = z.string().transform(Number).pipe(z.number().int().min(0))

@Controller('/catalog/series')
export class SeasonEpisodesController {
  constructor(private getSeasonEpisodesUseCase: GetSeasonEpisodesUseCase) {}

  @Get(':id/seasons/:season')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('id', new ZodValidationPipe(idSchema)) seriesId: number,
    @Param('season', new ZodValidationPipe(seasonSchema)) seasonNumber: number,
  ) {
    const result = await this.getSeasonEpisodesUseCase.execute({
      seriesId,
      seasonNumber,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: {
        episodes: result.value.episodes.map(SeriesPresenter.episodeToHTTP),
      },
      error: null,
    }
  }
}
