import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { MoviePresenter } from '../../infra/presenters/movie-presenter'

interface GetMoviesByGenreUseCaseRequest {
  genreId: number
  page: number
}

type GetMoviesByGenreUseCaseResponse = Either<
  never,
  {
    results: ReturnType<typeof MoviePresenter.toList>[]
    page: number
    totalPages: number
  }
>

@Injectable()
export class GetMoviesByGenreUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetMoviesByGenreUseCaseRequest,
  ): Promise<GetMoviesByGenreUseCaseResponse> {
    const data = await this.catalogCache.getMoviesByGenre(
      request.genreId,
      request.page,
    )

    return right({
      results: data.results.map(MoviePresenter.toList),
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
