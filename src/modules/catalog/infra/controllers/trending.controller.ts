import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetTrendingUseCase } from '../../application/use-cases/get-trending-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { SearchPresenter } from '../presenters/search-presenter'

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1).max(500))

@Controller('/catalog')
export class TrendingController {
  constructor(private getTrendingUseCase: GetTrendingUseCase) {}

  @Get('trending')
  @HttpCode(HttpStatus.OK)
  async handle(@Query('page', new ZodValidationPipe(pageSchema)) page: number) {
    const result = await this.getTrendingUseCase.execute({ page })

    const { results, page: currentPage, totalPages } = result.value

    return {
      success: true,
      data: {
        results: results.map(SearchPresenter.toHTTP),
        page: currentPage,
        totalPages,
      },
      error: null,
    }
  }
}
