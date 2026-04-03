import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { MoviePresenter } from '../../infra/presenters/movie-presenter'

interface GetUpcomingMoviesUseCaseRequest {
  page: number
}

type GetUpcomingMoviesUseCaseResponse = Either<
  never,
  {
    results: ReturnType<typeof MoviePresenter.toList>[]
    page: number
    totalPages: number
  }
>

@Injectable()
export class GetUpcomingMoviesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetUpcomingMoviesUseCaseRequest,
  ): Promise<GetUpcomingMoviesUseCaseResponse> {
    const data = await this.catalogCache.getUpcomingMovies(request.page)

    return right({
      results: data.results.map(MoviePresenter.toList),
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
