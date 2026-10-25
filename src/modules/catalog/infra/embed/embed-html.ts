import type { EmbedAudio } from '../../domain/ports/embed-sources-provider.port'

export interface EmbedMovieItem {
  audio: EmbedAudio
  label: string
  videoId: string | null
  url: string | null
}

const AUDIO_BY_TAB: Record<string, EmbedAudio> = {
  '1': 'dublado',
  '2': 'legendado',
}

const TAB_REGEX = /class="players_select_items[^"]*"\s+data-target="(\d+)"/g
const ITEM_REGEX =
  /<div class="player_select_item"([^>]*)>[\s\S]*?<div class="player_select_name">([\s\S]*?)<\/div>/g
const SEASON_REGEX =
  /<div class="episodes-of-season" data-season="(\d+)"([\s\S]*?)(?=<div class="episodes-of-season"|<\/episode-list>)/g
const EPISODE_TAG_REGEX = /<episode-item\b[^>]*>/g

function attr(tag: string, name: string): string | null {
  return new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? null
}

export function parseMovieItems(html: string): EmbedMovieItem[] {
  const tabs = [...html.matchAll(TAB_REGEX)]

  return tabs.flatMap((tab, i) => {
    const audio = AUDIO_BY_TAB[tab[1]]
    if (!audio) return []

    const body = html.slice(tab.index, tabs[i + 1]?.index)

    return [...body.matchAll(ITEM_REGEX)].flatMap(([, attrs, name]) => {
      const videoId = attr(attrs, 'data-id')
      const url = attr(attrs, 'data-url')?.replaceAll('&amp;', '&') ?? null

      // O HTML do embed também traz templates JS com os mesmos atributos (`${...}`)
      const hasVideoId = videoId !== null && /^\d+$/.test(videoId)
      const hasUrl = url !== null && url.startsWith('http')
      if (!hasVideoId && !hasUrl) return []

      return [
        {
          audio,
          label: name.replace(/\s+/g, ' ').trim(),
          videoId: hasVideoId ? videoId : null,
          url: hasVideoId ? null : url,
        },
      ]
    })
  })
}

export function findEpisodeContentId(
  html: string,
  season: number,
  episode: number,
): string | null {
  for (const [, seasonNumber, body] of html.matchAll(SEASON_REGEX)) {
    if (Number(seasonNumber) !== season) continue

    for (const [tag] of body.matchAll(EPISODE_TAG_REGEX)) {
      const contentId = attr(tag, 'data-contentid')
      if (attr(tag, 'data-epi-num') === String(episode) && contentId) {
        return /^\d+$/.test(contentId) ? contentId : null
      }
    }
  }

  return null
}

export function serverOf(label: string): string {
  const server = /\(([^()]*)\)[^()]*$/.exec(label)?.[1] ?? label
  return server.trim().toUpperCase()
}

export function toDirectUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const slug = parsed.searchParams.get('v')

    // O player.html do ABYS é só uma casca com anúncios sobre o player direto
    if (
      parsed.hostname === 'embedplayabyss.top' &&
      parsed.pathname === '/player.html' &&
      slug
    ) {
      return `https://player.abyssplayer.com/?v=${encodeURIComponent(slug)}`
    }
  } catch {
    // URL inválida passa intacta
  }

  return url
}

export function isVidsrc(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'vidsrc.sh' || hostname.endsWith('.vidsrc.sh')
  } catch {
    return false
  }
}
