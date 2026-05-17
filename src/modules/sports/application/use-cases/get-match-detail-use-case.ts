import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/errors/resource-not-found-error'
import { SportsCacheService } from '../../infra/sports-cache.service'
import { MatchPresenter } from '../../infra/presenters/match-presenter'

interface GetMatchDetailUseCaseRequest {
  id: number
}

export interface MatchDetailResponse {
  match: ReturnType<typeof MatchPresenter.toList>
  youtube: {
    videoId: string
    title: string
    channelTitle: string
    thumbnail: string | null
  } | null
}

type GetMatchDetailUseCaseResponse = Either<
  ResourceNotFoundError<{ matchId: number }>,
  MatchDetailResponse
>

@Injectable()
export class GetMatchDetailUseCase {
  constructor(private sportsCache: SportsCacheService) {}

  async execute({
    id,
  }: GetMatchDetailUseCaseRequest): Promise<GetMatchDetailUseCaseResponse> {
    const match = await this.sportsCache.getMatchById(id)
    if (!match) {
      return left(
        new ResourceNotFoundError({
          errors: [{ message: 'Partida não encontrada' }],
        }),
      )
    }

    const live = await this.sportsCache.findActiveYouTubeForMatch(match)

    return right({
      match: MatchPresenter.toList(match),
      youtube: live
        ? {
            videoId: live.videoId,
            title: live.title,
            channelTitle: live.channelTitle,
            thumbnail: live.thumbnail,
          }
        : null,
    })
  }
}
