export interface YouTubeSportsChannel {
  id: string
  name: string
  slug: string
}

export const YOUTUBE_SPORTS_CHANNELS: readonly YouTubeSportsChannel[] = [
  {
    id: 'UC8AB5LMTbtJyG_jbW5z0aCw',
    name: 'Cazé TV',
    slug: 'caze-tv',
  },
  {
    id: 'UCpcTrCXblq78GZrTUTLWeBw',
    name: 'FIFA+',
    slug: 'fifa-plus',
  },
] as const

export const YOUTUBE_SPORTS_CHANNEL_IDS: readonly string[] =
  YOUTUBE_SPORTS_CHANNELS.map((c) => c.id)
