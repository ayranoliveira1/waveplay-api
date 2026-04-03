import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { SearchCatalogUseCase } from '../../application/use-cases/search-catalog-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { SearchPresenter } from '../presenters/search-presenter'

const querySchema = z.string().min(1)
const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1))

@Controller('/catalog')
export class SearchController {
  constructor(private searchCatalogUseCase: SearchCatalogUseCase) {}

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Query('q', new ZodValidationPipe(querySchema)) query: string,
    @Query('page', new ZodValidationPipe(pageSchema)) page: number,
  ) {
    const result = await this.searchCatalogUseCase.execute({ query, page })

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
