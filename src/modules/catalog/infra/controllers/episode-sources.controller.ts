import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { z } from 'zod'

import { GetEpisodeSourcesUseCase } from '../../application/use-cases/get-episode-sources-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const idSchema = z
  .string()
  .transform(Number)
  .pipe(z.number().int().min(1).max(99999999))
const seasonSchema = z
  .string()
  .transform(Number)
  .pipe(z.number().int().min(0).max(100))
const episodeSchema = z
  .string()
  .transform(Number)
  .pipe(z.number().int().min(1).max(9999))

@Controller('/catalog/series')
export class EpisodeSourcesController {
  constructor(private getEpisodeSourcesUseCase: GetEpisodeSourcesUseCase) {}

  @Get(':id/seasons/:season/episodes/:episode/sources')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('id', new ZodValidationPipe(idSchema)) seriesId: number,
    @Param('season', new ZodValidationPipe(seasonSchema)) seasonNumber: number,
    @Param('episode', new ZodValidationPipe(episodeSchema))
    episodeNumber: number,
  ) {
    const result = await this.getEpisodeSourcesUseCase.execute({
      seriesId,
      seasonNumber,
      episodeNumber,
    })

    return {
      success: true,
      data: { sources: result.value.sources },
      error: null,
    }
  }
}
