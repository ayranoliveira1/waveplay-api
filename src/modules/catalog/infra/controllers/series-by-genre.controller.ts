import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common'
import { z } from 'zod'

import { GetSeriesByGenreUseCase } from '../../application/use-cases/get-series-by-genre-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const genreIdSchema = z
  .string()
  .transform(Number)
  .pipe(z.number().int().min(1).max(99999))

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1).max(500))

@Controller('/catalog/series')
export class SeriesByGenreController {
  constructor(private getSeriesByGenreUseCase: GetSeriesByGenreUseCase) {}

  @Get('genre/:genreId')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('genreId', new ZodValidationPipe(genreIdSchema)) genreId: number,
    @Query('page', new ZodValidationPipe(pageSchema)) page: number,
  ) {
    const result = await this.getSeriesByGenreUseCase.execute({
      genreId,
      page,
    })
    return { success: true, data: result.value, error: null }
  }
}
