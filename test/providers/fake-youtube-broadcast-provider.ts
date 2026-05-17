import {
  YouTubeBroadcastProviderPort,
  type YouTubeLive,
} from '@/modules/sports/domain/ports/youtube-broadcast.port'

export function makeFakeYouTubeLive(
  overrides: Partial<YouTubeLive> = {},
): YouTubeLive {
  return {
    videoId: 'abc123',
    title: 'AO VIVO 🔴 Palmeiras x São Paulo - Brasileirão',
    channelId: 'UC8AB5LMTbtJyG_jbW5z0aCw',
    channelTitle: 'Cazé TV',
    thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    startedAt: '2026-05-17T19:00:00Z',
    ...overrides,
  }
}

export class FakeYouTubeBroadcastProvider extends YouTubeBroadcastProviderPort {
  public lives: YouTubeLive[] = []

  async findActiveLivesByChannels(
    _channelIds: string[],
  ): Promise<YouTubeLive[]> {
    return this.lives
  }
}
