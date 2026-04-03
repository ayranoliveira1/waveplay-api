import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common'
import { z } from 'zod'

import { GetMoviesByGenreUseCase } from '../../application/use-cases/get-movies-by-genre-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const genreIdSchema = z.string().transform(Number).pipe(z.number().int().min(1))

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1))

@Controller('/catalog/movies')
export class MoviesByGenreController {
  constructor(private getMoviesByGenreUseCase: GetMoviesByGenreUseCase) {}

  @Get('genre/:genreId')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('genreId', new ZodValidationPipe(genreIdSchema)) genreId: number,
    @Query('page', new ZodValidationPipe(pageSchema)) page: number,
  ) {
    const result = await this.getMoviesByGenreUseCase.execute({
      genreId,
      page,
    })
    return { success: true, data: result.value, error: null }
  }
}
