import type { Progress } from '../../domain/entities/progress'

export class ProgressPresenter {
  static toHTTP(progress: Progress) {
    const base: Record<string, unknown> = {
      tmdbId: progress.tmdbId,
      type: progress.type,
      progressSeconds: progress.progressSeconds,
      durationSeconds: progress.durationSeconds,
      updatedAt: progress.updatedAt.toISOString(),
    }

    if (progress.season !== null) {
      base.season = progress.season
    }

    if (progress.episode !== null) {
      base.episode = progress.episode
    }

    return base
  }
}
