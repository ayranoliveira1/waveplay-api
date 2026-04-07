import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetOnTheAirSeriesUseCase } from '../../application/use-cases/get-on-the-air-series-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1).max(500))

@Controller('/catalog/series')
export class OnTheAirSeriesController {
  constructor(private getOnTheAirSeriesUseCase: GetOnTheAirSeriesUseCase) {}

  @Get('on-the-air')
  @HttpCode(HttpStatus.OK)
  async handle(@Query('page', new ZodValidationPipe(pageSchema)) page: number) {
    const result = await this.getOnTheAirSeriesUseCase.execute({ page })
    return { success: true, data: result.value, error: null }
  }
}
