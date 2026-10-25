export type EmbedAudio = 'dublado' | 'legendado'

export interface EmbedSource {
  audio: EmbedAudio
  server: string
  label: string
  url: string
  sandbox: boolean
  reportsTime: boolean
}

export abstract class EmbedSourcesProviderPort {
  abstract getMovieSources(tmdbId: number): Promise<EmbedSource[]>

  abstract getEpisodeSources(
    tmdbId: number,
    season: number,
    episode: number,
  ): Promise<EmbedSource[]>
}
