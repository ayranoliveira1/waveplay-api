import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { MoviePresenter } from '../../infra/presenters/movie-presenter'

interface GetSimilarMoviesUseCaseRequest {
  id: number
  page: number
}

type GetSimilarMoviesUseCaseResponse = Either<
  never,
  {
    results: ReturnType<typeof MoviePresenter.toList>[]
    page: number
    totalPages: number
  }
>

@Injectable()
export class GetSimilarMoviesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetSimilarMoviesUseCaseRequest,
  ): Promise<GetSimilarMoviesUseCaseResponse> {
    const data = await this.catalogCache.getSimilarMovies(
      request.id,
      request.page,
    )

    return right({
      results: data.results.map(MoviePresenter.toList),
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
