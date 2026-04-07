import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetUpcomingMoviesUseCase } from '../../application/use-cases/get-upcoming-movies-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1).max(500))

@Controller('/catalog/movies')
export class UpcomingMoviesController {
  constructor(private getUpcomingMoviesUseCase: GetUpcomingMoviesUseCase) {}

  @Get('upcoming')
  @HttpCode(HttpStatus.OK)
  async handle(@Query('page', new ZodValidationPipe(pageSchema)) page: number) {
    const result = await this.getUpcomingMoviesUseCase.execute({ page })
    return { success: true, data: result.value, error: null }
  }
}
