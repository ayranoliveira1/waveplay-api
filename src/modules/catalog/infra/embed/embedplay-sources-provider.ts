import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { z } from 'zod'

import { EnvService } from '../../../../shared/env/env.service'
import {
  EmbedSourcesProviderPort,
  type EmbedAudio,
  type EmbedSource,
  type EmbedSourcesResult,
} from '../../domain/ports/embed-sources-provider.port'
import {
  findEpisodeContentId,
  hasMovieTabs,
  hasSeasonBlocks,
  isHttpUrl,
  isVidsrc,
  parseMovieItems,
  serverOf,
  toDirectUrl,
} from './embed-html'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

// O embed recusa páginas sem o referer do domínio que o incorpora
const PAGE_REFERER = 'https://embedplayapi.top/'

const optionsResponseSchema = z.object({
  data: z.object({
    options: z.array(
      z.object({
        type: z.coerce.string(),
        url: z.string(),
        server: z.string().nullish(),
      }),
    ),
  }),
})

const playerResponseSchema = z.object({
  data: z.object({ video_url: z.string().refine(isHttpUrl) }),
})

function toSource(audio: EmbedAudio, label: string, url: string): EmbedSource {
  const directUrl = toDirectUrl(url)
  const vidsrc = isVidsrc(directUrl)

  // O Vidsrc recusa iframe com sandbox e é a única fonte que informa o tempo do vídeo
  return {
    audio,
    server: serverOf(label),
    label,
    url: directUrl,
    sandbox: !vidsrc,
    reportsTime: vidsrc,
  }
}

function dubbedFirst(sources: EmbedSource[]): EmbedSource[] {
  return [
    ...sources.filter((source) => source.audio === 'dublado'),
    ...sources.filter((source) => source.audio === 'legendado'),
  ]
}

@Injectable()
export class EmbedplaySourcesProvider extends EmbedSourcesProviderPort {
  private readonly logger = new Logger(EmbedplaySourcesProvider.name)
  private readonly api: AxiosInstance

  constructor(private env: EnvService) {
    super()
    this.api = axios.create({
      baseURL: this.env.get('EMBED_SOURCES_BASE_URL'),
      timeout: 8000,
      // Título fora do embed responde 302 para /404.php, que é 200 e não pode virar "página sem fontes"
      maxRedirects: 0,
      headers: { 'User-Agent': USER_AGENT },
      validateStatus: (status) => status === 200,
    })
  }

  async getMovieSources(tmdbId: number): Promise<EmbedSourcesResult> {
    try {
      const pagePath = `/filme/${tmdbId}`
      const html = await this.getPage(pagePath)
      if (!hasMovieTabs(html)) {
        this.logger.warn(
          `Filme ${tmdbId}: página do embed sem as abas de fontes (layout mudou?)`,
        )
        return { sources: [], complete: false }
      }

      const items = parseMovieItems(html)

      const sources = await Promise.all(
        items.map(async (item) => {
          const url =
            item.url ??
            (item.videoId ? await this.getPlayer(pagePath, item.videoId) : null)
          return url ? toSource(item.audio, item.label, url) : null
        }),
      )

      const resolved = sources.filter((source) => source !== null)

      return {
        sources: dubbedFirst(resolved),
        complete: resolved.length === items.length,
      }
    } catch (error) {
      this.logger.warn(`Fontes do filme ${tmdbId} indisponíveis: ${error}`)
      return { sources: [], complete: false }
    }
  }

  async getEpisodeSources(
    tmdbId: number,
    season: number,
    episode: number,
  ): Promise<EmbedSourcesResult> {
    try {
      const pagePath = `/serie/${tmdbId}/${season}/${episode}`
      const html = await this.getPage(pagePath)
      if (!hasSeasonBlocks(html)) {
        this.logger.warn(
          `Série ${tmdbId}: página do embed sem as temporadas (layout mudou?)`,
        )
        return { sources: [], complete: false }
      }

      const contentId = findEpisodeContentId(html, season, episode)
      if (!contentId) return { sources: [], complete: true }

      const options = optionsResponseSchema
        .parse(
          await this.postApi(pagePath, {
            action: 'getOptions',
            contentid: contentId,
          }),
        )
        .data.options.filter((option) => isHttpUrl(option.url))
      if (options.length === 0) return { sources: [], complete: true }

      const counters: Record<EmbedAudio, number> = { dublado: 0, legendado: 0 }
      const sources = options.map((option) => {
        const audio: EmbedAudio = option.type === '1' ? 'dublado' : 'legendado'
        const n = ++counters[audio]
        const label = option.server
          ? `Opção ${n} (${option.server})`
          : `Opção ${n}`
        return toSource(audio, label, option.url)
      })

      // Como o addVidsrcLegendado do embed: só entra quando o episódio tem ao menos uma opção
      sources.push(
        toSource(
          'legendado',
          'Legendado (EUA)',
          `https://vidsrc.sh/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=pt&autoplay=1`,
        ),
      )

      return { sources: dubbedFirst(sources), complete: true }
    } catch (error) {
      this.logger.warn(
        `Fontes do episódio ${tmdbId} T${season}E${episode} indisponíveis: ${error}`,
      )
      return { sources: [], complete: false }
    }
  }

  private async getPage(path: string): Promise<string> {
    const { data } = await this.api.get<string>(path, {
      headers: { Referer: PAGE_REFERER },
      responseType: 'text',
    })
    if (typeof data !== 'string') throw new Error(`HTML inesperado em ${path}`)
    return data
  }

  private async postApi(
    pagePath: string,
    params: Record<string, string>,
  ): Promise<unknown> {
    const { data } = await this.api.post('/api', new URLSearchParams(params), {
      headers: {
        Referer: this.api.getUri({ url: pagePath }),
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
    return data
  }

  private async getPlayer(
    pagePath: string,
    videoId: string,
  ): Promise<string | null> {
    try {
      const data = await this.postApi(pagePath, {
        action: 'getPlayer',
        video_id: videoId,
      })
      return playerResponseSchema.parse(data).data.video_url
    } catch (error) {
      this.logger.warn(`Player ${videoId} indisponível: ${error}`)
      return null
    }
  }
}
