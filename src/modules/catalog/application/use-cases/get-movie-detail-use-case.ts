import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { CatalogNotFoundError } from '../../domain/errors/catalog-not-found.error'
import type { TMDBMovie } from '../../domain/ports/catalog-provider.port'

interface GetMovieDetailUseCaseRequest {
  id: number
}

type GetMovieDetailUseCaseResponse = Either<
  CatalogNotFoundError,
  { movie: TMDBMovie }
>

@Injectable()
export class GetMovieDetailUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetMovieDetailUseCaseRequest,
  ): Promise<GetMovieDetailUseCaseResponse> {
    const movie = await this.catalogCache.getMovieDetail(request.id)

    if (!movie) {
      return left(new CatalogNotFoundError('movie', request.id))
    }

    return right({ movie })
  }
}
