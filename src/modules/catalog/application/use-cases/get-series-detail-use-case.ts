import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { CatalogNotFoundError } from '../../domain/errors/catalog-not-found.error'
import type { TMDBSeries } from '../../domain/ports/catalog-provider.port'

interface GetSeriesDetailUseCaseRequest {
  id: number
}

type GetSeriesDetailUseCaseResponse = Either<
  CatalogNotFoundError,
  { series: TMDBSeries }
>

@Injectable()
export class GetSeriesDetailUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetSeriesDetailUseCaseRequest,
  ): Promise<GetSeriesDetailUseCaseResponse> {
    const series = await this.catalogCache.getSeriesDetail(request.id)

    if (!series) {
      return left(new CatalogNotFoundError('series', request.id))
    }

    return right({ series })
  }
}
