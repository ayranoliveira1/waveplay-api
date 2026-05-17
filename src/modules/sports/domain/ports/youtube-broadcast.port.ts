export interface YouTubeLive {
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  thumbnail: string | null
  startedAt: string | null
}

export abstract class YouTubeBroadcastProviderPort {
  abstract findActiveLivesByChannels(
    channelIds: string[],
  ): Promise<YouTubeLive[]>
}
