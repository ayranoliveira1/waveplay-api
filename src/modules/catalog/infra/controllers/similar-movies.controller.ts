import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common'
import { z } from 'zod'

import { GetSimilarMoviesUseCase } from '../../application/use-cases/get-similar-movies-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const idSchema = z.string().transform(Number).pipe(z.number().int().min(1))

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1).max(500))

@Controller('/catalog/movies')
export class SimilarMoviesController {
  constructor(private getSimilarMoviesUseCase: GetSimilarMoviesUseCase) {}

  @Get(':id/similar')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('id', new ZodValidationPipe(idSchema)) id: number,
    @Query('page', new ZodValidationPipe(pageSchema)) page: number,
  ) {
    const result = await this.getSimilarMoviesUseCase.execute({ id, page })
    return { success: true, data: result.value, error: null }
  }
}
