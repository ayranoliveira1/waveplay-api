import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { z } from 'zod'

import { EnvService } from '../../../../shared/env/env.service'
import {
  EmbedSourcesProviderPort,
  type EmbedAudio,
  type EmbedSource,
} from '../../domain/ports/embed-sources-provider.port'
import {
  findEpisodeContentId,
  isVidsrc,
  parseMovieItems,
  serverOf,
  toDirectUrl,
} from './embed-html'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

// O embed recusa páginas sem o referer do domínio que o incorpora
const PAGE_REFERER = 'https://embedplayapi.top/'

// A URL vira o src do iframe na web: `javascript:` ou outro esquema vindo do embed nunca passa
const isHttpUrl = (url: string) => /^https?:\/\//i.test(url)

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
      headers: { 'User-Agent': USER_AGENT },
      validateStatus: (status) => status === 200,
    })
  }

  async getMovieSources(tmdbId: number): Promise<EmbedSource[]> {
    try {
      const pagePath = `/filme/${tmdbId}`
      const items = parseMovieItems(await this.getPage(pagePath))

      const sources = await Promise.all(
        items.map(async (item) => {
          const url =
            item.url ??
            (item.videoId ? await this.getPlayer(pagePath, item.videoId) : null)
          return url ? toSource(item.audio, item.label, url) : null
        }),
      )

      return dubbedFirst(sources.filter((source) => source !== null))
    } catch (error) {
      this.logger.warn(`Fontes do filme ${tmdbId} indisponíveis: ${error}`)
      return []
    }
  }

  async getEpisodeSources(
    tmdbId: number,
    season: number,
    episode: number,
  ): Promise<EmbedSource[]> {
    try {
      const pagePath = `/serie/${tmdbId}/${season}/${episode}`
      const contentId = findEpisodeContentId(
        await this.getPage(pagePath),
        season,
        episode,
      )
      if (!contentId) return []

      const options = optionsResponseSchema
        .parse(
          await this.postApi(pagePath, {
            action: 'getOptions',
            contentid: contentId,
          }),
        )
        .data.options.filter((option) => isHttpUrl(option.url))
      if (options.length === 0) return []

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

      return dubbedFirst(sources)
    } catch (error) {
      this.logger.warn(
        `Fontes do episódio ${tmdbId} T${season}E${episode} indisponíveis: ${error}`,
      )
      return []
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
