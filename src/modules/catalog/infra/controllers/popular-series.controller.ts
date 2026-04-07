import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetPopularSeriesUseCase } from '../../application/use-cases/get-popular-series-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1).max(500))

@Controller('/catalog/series')
export class PopularSeriesController {
  constructor(private getPopularSeriesUseCase: GetPopularSeriesUseCase) {}

  @Get('popular')
  @HttpCode(HttpStatus.OK)
  async handle(@Query('page', new ZodValidationPipe(pageSchema)) page: number) {
    const result = await this.getPopularSeriesUseCase.execute({ page })
    return { success: true, data: result.value, error: null }
  }
}
