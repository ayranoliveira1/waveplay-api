import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import {
  SportsCacheService,
  type LiveBroadcast,
} from '../../infra/sports-cache.service'

type GetLiveBroadcastsUseCaseResponse = Either<
  never,
  { broadcasts: LiveBroadcast[] }
>

@Injectable()
export class GetLiveBroadcastsUseCase {
  constructor(private sportsCache: SportsCacheService) {}

  async execute(): Promise<GetLiveBroadcastsUseCaseResponse> {
    const broadcasts = await this.sportsCache.getLiveBroadcasts()
    return right({ broadcasts })
  }
}
