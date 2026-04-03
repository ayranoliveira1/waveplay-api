import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { SeriesPresenter } from '../../infra/presenters/series-presenter'

interface GetPopularSeriesUseCaseRequest {
  page: number
}

type GetPopularSeriesUseCaseResponse = Either<
  never,
  {
    results: ReturnType<typeof SeriesPresenter.toList>[]
    page: number
    totalPages: number
  }
>

@Injectable()
export class GetPopularSeriesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetPopularSeriesUseCaseRequest,
  ): Promise<GetPopularSeriesUseCaseResponse> {
    const data = await this.catalogCache.getPopularSeries(request.page)

    return right({
      results: data.results.map(SeriesPresenter.toList),
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
