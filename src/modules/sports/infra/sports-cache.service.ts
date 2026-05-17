import { Inject, Injectable } from '@nestjs/common'
import type Redis from 'ioredis'

import { REDIS_CLIENT } from '@/shared/redis/redis.module'
import {
  SportsProviderPort,
  type FootballDataMatch,
} from '../domain/ports/sports-provider.port'
import {
  YouTubeBroadcastProviderPort,
  type YouTubeLive,
} from '../domain/ports/youtube-broadcast.port'
import { MatchPresenter } from './presenters/match-presenter'
import { YOUTUBE_SPORTS_CHANNEL_IDS } from './youtube-channels'
import { findMatchByTeams, parseTeamsFromTitle } from './broadcast-matcher'

const TTL = {
  LIVE_DAY: 30,
  FIXTURES: 300,
  FINISHED: 3600,
  YOUTUBE_LIVES: 3600,
} as const

export type MatchListItem = ReturnType<typeof MatchPresenter.toList>

export interface LiveBroadcast {
  youtube: {
    videoId: string
    title: string
    channelTitle: string
    thumbnail: string | null
  }
  match: MatchListItem
}

@Injectable()
export class SportsCacheService {
  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    private sportsProvider: SportsProviderPort,
    private youtubeBroadcastProvider: YouTubeBroadcastProviderPort,
  ) {}

  private async getOrFetch<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.redis.get(key)
      if (cached) return JSON.parse(cached) as T
    } catch {
      // Redis down — fallback to provider
    }

    const data = await fetcher()

    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttl)
    } catch {
      // Redis down — skip cache write
    }

    return data
  }

  private async getRawMatchesByDate(
    date: string,
  ): Promise<FootballDataMatch[]> {
    const today = new Date().toISOString().slice(0, 10)
    const ttl = date === today ? TTL.LIVE_DAY : TTL.FIXTURES

    return this.getOrFetch(`sports:raw-matches:${date}`, ttl, async () => {
      const data = await this.sportsProvider.getMatchesByDate(date)
      return data.matches
    })
  }

  private async getActiveLives(): Promise<YouTubeLive[]> {
    return this.getOrFetch(
      `sports:youtube-lives:${YOUTUBE_SPORTS_CHANNEL_IDS.join(',')}`,
      TTL.YOUTUBE_LIVES,
      () =>
        this.youtubeBroadcastProvider.findActiveLivesByChannels([
          ...YOUTUBE_SPORTS_CHANNEL_IDS,
        ]),
    )
  }

  async getLiveBroadcasts(): Promise<LiveBroadcast[]> {
    const today = new Date().toISOString().slice(0, 10)
    const [lives, matches] = await Promise.all([
      this.getActiveLives(),
      this.getRawMatchesByDate(today),
    ])

    const broadcasts: LiveBroadcast[] = []
    for (const live of lives) {
      const parsed = parseTeamsFromTitle(live.title)
      if (!parsed) continue

      const match = findMatchByTeams(matches, parsed)
      if (!match) continue

      broadcasts.push({
        youtube: {
          videoId: live.videoId,
          title: live.title,
          channelTitle: live.channelTitle,
          thumbnail: live.thumbnail,
        },
        match: MatchPresenter.toList(match),
      })
    }

    return broadcasts
  }

  async getMatchById(id: number): Promise<FootballDataMatch | null> {
    return this.getOrFetch(`sports:match:${id}`, TTL.LIVE_DAY, () =>
      this.sportsProvider.getMatchById(id),
    )
  }

  async findActiveYouTubeForMatch(
    match: FootballDataMatch,
  ): Promise<YouTubeLive | null> {
    const lives = await this.getActiveLives()
    for (const live of lives) {
      const parsed = parseTeamsFromTitle(live.title)
      if (!parsed) continue
      if (findMatchByTeams([match], parsed)) {
        return live
      }
    }
    return null
  }
}
