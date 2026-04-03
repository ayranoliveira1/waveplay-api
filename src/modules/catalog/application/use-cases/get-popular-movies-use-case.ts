import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { MoviePresenter } from '../../infra/presenters/movie-presenter'

interface GetPopularMoviesUseCaseRequest {
  page: number
}

type GetPopularMoviesUseCaseResponse = Either<
  never,
  {
    results: ReturnType<typeof MoviePresenter.toList>[]
    page: number
    totalPages: number
  }
>

@Injectable()
export class GetPopularMoviesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetPopularMoviesUseCaseRequest,
  ): Promise<GetPopularMoviesUseCaseResponse> {
    const data = await this.catalogCache.getPopularMovies(request.page)

    return right({
      results: data.results.map(MoviePresenter.toList),
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
