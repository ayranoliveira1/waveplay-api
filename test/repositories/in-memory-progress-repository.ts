import type { Progress } from '@/modules/playback/domain/entities/progress'
import type { ProgressRepository } from '@/modules/playback/domain/repositories/progress-repository'

export class InMemoryProgressRepository implements ProgressRepository {
  public items: Progress[] = []

  async upsert(progress: Progress): Promise<void> {
    const index = this.items.findIndex(
      (i) =>
        i.profileId === progress.profileId &&
        i.tmdbId === progress.tmdbId &&
        i.type === progress.type &&
        i.season === progress.season &&
        i.episode === progress.episode,
    )

    if (index >= 0) {
      this.items[index] = progress
    } else {
      this.items.push(progress)
    }
  }

  async findContinueWatching(profileId: string): Promise<Progress[]> {
    return this.items
      .filter(
        (i) =>
          i.profileId === profileId &&
          i.progressSeconds > 0 &&
          i.progressSeconds < i.durationSeconds * 0.9,
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async countContinueWatching(profileId: string): Promise<number> {
    return this.items.filter(
      (i) =>
        i.profileId === profileId &&
        i.progressSeconds > 0 &&
        i.progressSeconds < i.durationSeconds * 0.9,
    ).length
  }
}
