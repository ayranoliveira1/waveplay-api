import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { SeriesPresenter } from '../../infra/presenters/series-presenter'

interface GetAiringTodaySeriesUseCaseRequest {
  page: number
}

type GetAiringTodaySeriesUseCaseResponse = Either<
  never,
  {
    results: ReturnType<typeof SeriesPresenter.toList>[]
    page: number
    totalPages: number
  }
>

@Injectable()
export class GetAiringTodaySeriesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetAiringTodaySeriesUseCaseRequest,
  ): Promise<GetAiringTodaySeriesUseCaseResponse> {
    const data = await this.catalogCache.getAiringTodaySeries(request.page)

    return right({
      results: data.results.map(SeriesPresenter.toList),
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
