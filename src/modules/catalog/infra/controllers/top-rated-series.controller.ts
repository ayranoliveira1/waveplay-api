import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetTopRatedSeriesUseCase } from '../../application/use-cases/get-top-rated-series-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1))

@Controller('/catalog/series')
export class TopRatedSeriesController {
  constructor(private getTopRatedSeriesUseCase: GetTopRatedSeriesUseCase) {}

  @Get('top-rated')
  @HttpCode(HttpStatus.OK)
  async handle(@Query('page', new ZodValidationPipe(pageSchema)) page: number) {
    const result = await this.getTopRatedSeriesUseCase.execute({ page })
    return { success: true, data: result.value, error: null }
  }
}
