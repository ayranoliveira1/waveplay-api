import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { SeriesPresenter } from '../../infra/presenters/series-presenter'

interface GetSimilarSeriesUseCaseRequest {
  id: number
  page: number
}

type GetSimilarSeriesUseCaseResponse = Either<
  never,
  {
    results: ReturnType<typeof SeriesPresenter.toList>[]
    page: number
    totalPages: number
  }
>

@Injectable()
export class GetSimilarSeriesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetSimilarSeriesUseCaseRequest,
  ): Promise<GetSimilarSeriesUseCaseResponse> {
    const data = await this.catalogCache.getSimilarSeries(
      request.id,
      request.page,
    )

    return right({
      results: data.results.map(SeriesPresenter.toList),
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
