import {
  EmbedSourcesProviderPort,
  type EmbedSource,
  type EmbedSourcesResult,
} from '@/modules/catalog/domain/ports/embed-sources-provider.port'

export function makeFakeEmbedSource(
  overrides: Partial<EmbedSource> = {},
): EmbedSource {
  return {
    audio: 'dublado',
    server: 'ABYS',
    label: 'Opção 1 (ABYS)',
    url: 'https://player.abyssplayer.com/?v=iqYVq7a2S',
    sandbox: true,
    reportsTime: false,
    ...overrides,
  }
}

export class FakeEmbedSourcesProvider extends EmbedSourcesProviderPort {
  sources: EmbedSource[] = [
    makeFakeEmbedSource(),
    makeFakeEmbedSource({
      audio: 'legendado',
      server: 'EUA',
      label: 'Legendado (EUA)',
      url: 'https://vidsrc.sh/embed/movie?imdb=tt0137523&ds_lang=pt&autoplay=1',
      sandbox: false,
      reportsTime: true,
    }),
  ]

  complete = true

  async getMovieSources(): Promise<EmbedSourcesResult> {
    return { sources: this.sources, complete: this.complete }
  }

  async getEpisodeSources(): Promise<EmbedSourcesResult> {
    return { sources: this.sources, complete: this.complete }
  }
}
