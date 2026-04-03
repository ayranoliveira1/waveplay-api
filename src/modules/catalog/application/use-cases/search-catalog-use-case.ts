import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import type { TMDBMultiResult } from '../../domain/ports/catalog-provider.port'

interface SearchCatalogUseCaseRequest {
  query: string
  page: number
}

interface PaginatedResult<T> {
  results: T[]
  page: number
  totalPages: number
}

type SearchCatalogUseCaseResponse = Either<
  never,
  PaginatedResult<TMDBMultiResult>
>

@Injectable()
export class SearchCatalogUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: SearchCatalogUseCaseRequest,
  ): Promise<SearchCatalogUseCaseResponse> {
    const data = await this.catalogCache.search(request.query, request.page)

    return right({
      results: data.results,
      page: data.page,
      totalPages: data.total_pages,
    })
  }
}
