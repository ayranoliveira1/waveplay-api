import type { HistoryItem } from '../../domain/entities/history-item'

export class HistoryPresenter {
  static toHTTP(item: HistoryItem) {
    const base: Record<string, unknown> = {
      id: item.id.toValue(),
      tmdbId: item.tmdbId,
      type: item.type,
      title: item.title,
      posterPath: item.posterPath,
      progressSeconds: item.progressSeconds,
      durationSeconds: item.durationSeconds,
      watchedAt: item.watchedAt.toISOString(),
    }

    if (item.season !== null) {
      base.season = item.season
    }

    if (item.episode !== null) {
      base.episode = item.episode
    }

    return base
  }
}
