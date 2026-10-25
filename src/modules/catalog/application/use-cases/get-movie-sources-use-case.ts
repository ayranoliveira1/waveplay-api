import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import type { EmbedSource } from '../../domain/ports/embed-sources-provider.port'

interface GetMovieSourcesUseCaseRequest {
  id: number
}

type GetMovieSourcesUseCaseResponse = Either<never, { sources: EmbedSource[] }>

@Injectable()
export class GetMovieSourcesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetMovieSourcesUseCaseRequest,
  ): Promise<GetMovieSourcesUseCaseResponse> {
    const sources = await this.catalogCache.getMovieSources(request.id)

    return right({ sources })
  }
}
