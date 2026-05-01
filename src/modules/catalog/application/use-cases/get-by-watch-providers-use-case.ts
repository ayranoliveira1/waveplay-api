import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import {
  CatalogCacheService,
  type ByWatchProvidersResult,
} from '../../infra/catalog-cache.service'

interface GetByWatchProvidersUseCaseRequest {
  providers: number[]
  page: number
}

type GetByWatchProvidersUseCaseResponse = Either<never, ByWatchProvidersResult>

@Injectable()
export class GetByWatchProvidersUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetByWatchProvidersUseCaseRequest,
  ): Promise<GetByWatchProvidersUseCaseResponse> {
    const data = await this.catalogCache.getByWatchProviders(
      request.providers,
      request.page,
    )

    return right(data)
  }
}
