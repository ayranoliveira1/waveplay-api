import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import type { TMDBMultiResult } from '../../domain/ports/catalog-provider.port'

interface GetTrendingUseCaseRequest {
  page: number
}

interface PaginatedResult<T> {
  results: T[]
  page: number
  totalPages: number
}

type GetTrendingUseCaseResponse = Either<
  never,
  PaginatedResult<TMDBMultiResult>
>

@Injectable()
export class GetTrendingUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetTrendingUseCaseRequest,
  ): Promise<GetTrendingUseCaseResponse> {
    const data = await this.catalogCache.getTrending(request.page)

    return right({
      results: data.results,
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
