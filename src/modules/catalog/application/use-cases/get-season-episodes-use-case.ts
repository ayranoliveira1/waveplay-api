import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import { CatalogNotFoundError } from '../../domain/errors/catalog-not-found.error'
import type { TMDBEpisode } from '../../domain/ports/catalog-provider.port'

interface GetSeasonEpisodesUseCaseRequest {
  seriesId: number
  seasonNumber: number
}

type GetSeasonEpisodesUseCaseResponse = Either<
  CatalogNotFoundError,
  { episodes: TMDBEpisode[] }
>

@Injectable()
export class GetSeasonEpisodesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetSeasonEpisodesUseCaseRequest,
  ): Promise<GetSeasonEpisodesUseCaseResponse> {
    const episodes = await this.catalogCache.getSeasonEpisodes(
      request.seriesId,
      request.seasonNumber,
    )

    if (!episodes) {
      return left(new CatalogNotFoundError('season', request.seasonNumber))
    }

    return right({ episodes })
  }
}
