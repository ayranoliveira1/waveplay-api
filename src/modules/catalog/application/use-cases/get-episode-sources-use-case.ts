import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import type { EmbedSource } from '../../domain/ports/embed-sources-provider.port'

interface GetEpisodeSourcesUseCaseRequest {
  seriesId: number
  seasonNumber: number
  episodeNumber: number
}

type GetEpisodeSourcesUseCaseResponse = Either<
  never,
  { sources: EmbedSource[] }
>

@Injectable()
export class GetEpisodeSourcesUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(
    request: GetEpisodeSourcesUseCaseRequest,
  ): Promise<GetEpisodeSourcesUseCaseResponse> {
    const sources = await this.catalogCache.getEpisodeSources(
      request.seriesId,
      request.seasonNumber,
      request.episodeNumber,
    )

    return right({ sources })
  }
}
