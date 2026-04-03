import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetPopularMoviesUseCase } from '../../application/use-cases/get-popular-movies-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1))

@Controller('/catalog/movies')
export class PopularMoviesController {
  constructor(private getPopularMoviesUseCase: GetPopularMoviesUseCase) {}

  @Get('popular')
  @HttpCode(HttpStatus.OK)
  async handle(@Query('page', new ZodValidationPipe(pageSchema)) page: number) {
    const result = await this.getPopularMoviesUseCase.execute({ page })
    return { success: true, data: result.value, error: null }
  }
}
