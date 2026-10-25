export type EmbedAudio = 'dublado' | 'legendado'

export interface EmbedSource {
  audio: EmbedAudio
  server: string
  label: string
  url: string
  sandbox: boolean
  reportsTime: boolean
}

// complete = false quando alguma etapa falhou e a lista pode estar faltando fontes
export interface EmbedSourcesResult {
  sources: EmbedSource[]
  complete: boolean
}

export abstract class EmbedSourcesProviderPort {
  abstract getMovieSources(tmdbId: number): Promise<EmbedSourcesResult>

  abstract getEpisodeSources(
    tmdbId: number,
    season: number,
    episode: number,
  ): Promise<EmbedSourcesResult>
}
