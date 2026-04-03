import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { z } from 'zod'

import { GetSeriesDetailUseCase } from '../../application/use-cases/get-series-detail-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { SeriesPresenter } from '../presenters/series-presenter'

const idSchema = z.string().transform(Number).pipe(z.number().int().min(1))

@Controller('/catalog/series')
export class SeriesDetailController {
  constructor(private getSeriesDetailUseCase: GetSeriesDetailUseCase) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id', new ZodValidationPipe(idSchema)) id: number) {
    const result = await this.getSeriesDetailUseCase.execute({ id })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: { series: SeriesPresenter.toDetail(result.value.series) },
      error: null,
    }
  }
}
