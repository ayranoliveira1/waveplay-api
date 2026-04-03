import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import { CatalogCacheService } from '../../infra/catalog-cache.service'
import type { TMDBGenre } from '../../domain/ports/catalog-provider.port'

type GetMovieGenresUseCaseResponse = Either<never, { genres: TMDBGenre[] }>

@Injectable()
export class GetMovieGenresUseCase {
  constructor(private catalogCache: CatalogCacheService) {}

  async execute(): Promise<GetMovieGenresUseCaseResponse> {
    const genres = await this.catalogCache.getMovieGenres()
    return right({ genres })
  }
}
