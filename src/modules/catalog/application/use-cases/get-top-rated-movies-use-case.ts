import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { MoviePresenter } from '../../infra/presenters/movie-presenter'

interface GetTopRatedMoviesUseCaseRequest {
  page: number
}

type GetTopRatedMoviesUseCaseResponse = Either<
  never,
  {
    results: ReturnType<typeof MoviePresenter.toList>[]
    page: number
    totalPages: number
  }
>

@Injectable()
export class GetTopRatedMoviesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetTopRatedMoviesUseCaseRequest,
  ): Promise<GetTopRatedMoviesUseCaseResponse> {
    const data = await this.catalogCache.getTopRatedMovies(request.page)

    return right({
      results: data.results.map(MoviePresenter.toList),
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
