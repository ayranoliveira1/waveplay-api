import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import type { AxiosInstance } from 'axios'

import { EnvService } from '@/shared/env/env.service'
import {
  YouTubeBroadcastProviderPort,
  type YouTubeLive,
} from '../domain/ports/youtube-broadcast.port'

const BASE_URL = 'https://www.googleapis.com/youtube/v3'

interface YouTubeSearchItem {
  id: { videoId: string }
  snippet: {
    title: string
    channelId: string
    channelTitle: string
    publishedAt?: string
    thumbnails?: {
      high?: { url: string }
      medium?: { url: string }
      default?: { url: string }
    }
  }
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[]
}

@Injectable()
export class YouTubeBroadcastProvider extends YouTubeBroadcastProviderPort {
  private readonly api: AxiosInstance
  private readonly logger = new Logger(YouTubeBroadcastProvider.name)

  constructor(private env: EnvService) {
    super()
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10_000,
      maxRedirects: 0,
      headers: { Accept: 'application/json' },
    })
  }

  async findActiveLivesByChannels(
    channelIds: string[],
  ): Promise<YouTubeLive[]> {
    if (channelIds.length === 0) return []

    const apiKey = this.env.get('YOUTUBE_API_KEY')
    const results = await Promise.allSettled(
      channelIds.map((channelId) =>
        this.api.get<YouTubeSearchResponse>('/search', {
          params: {
            key: apiKey,
            channelId,
            eventType: 'live',
            type: 'video',
            part: 'snippet',
            maxResults: 5,
          },
        }),
      ),
    )

    const lives: YouTubeLive[] = []
    for (const result of results) {
      if (result.status !== 'fulfilled') {
        this.logger.warn(
          `YouTube search failed: ${(result.reason as Error)?.message}`,
        )
        continue
      }
      const items = result.value.data.items ?? []
      for (const item of items) {
        if (!item.id?.videoId) continue
        lives.push({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          thumbnail:
            item.snippet.thumbnails?.high?.url ??
            item.snippet.thumbnails?.medium?.url ??
            item.snippet.thumbnails?.default?.url ??
            null,
          startedAt: item.snippet.publishedAt ?? null,
        })
      }
    }

    return lives
  }
}
