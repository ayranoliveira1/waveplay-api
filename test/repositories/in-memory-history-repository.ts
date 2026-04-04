import type { HistoryItem } from '@/modules/playback/domain/entities/history-item'
import type { HistoryRepository } from '@/modules/playback/domain/repositories/history-repository'

export class InMemoryHistoryRepository implements HistoryRepository {
  public items: HistoryItem[] = []

  async upsertAndCleanup(item: HistoryItem, limit: number): Promise<void> {
    const index = this.items.findIndex(
      (i) =>
        i.profileId === item.profileId &&
        i.tmdbId === item.tmdbId &&
        i.type === item.type &&
        i.season === item.season &&
        i.episode === item.episode,
    )

    if (index >= 0) {
      this.items[index] = item
    } else {
      this.items.push(item)
    }

    const profileItems = this.items
      .filter((i) => i.profileId === item.profileId)
      .sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())

    if (profileItems.length > limit) {
      const toRemove = profileItems.slice(limit)
      this.items = this.items.filter((i) => !toRemove.includes(i))
    }
  }

  async findByProfileId(
    profileId: string,
    page: number,
    perPage: number,
  ): Promise<HistoryItem[]> {
    const filtered = this.items
      .filter((i) => i.profileId === profileId)
      .sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())

    return filtered.slice((page - 1) * perPage, page * perPage)
  }

  async countByProfileId(profileId: string): Promise<number> {
    return this.items.filter((i) => i.profileId === profileId).length
  }

  async deleteAllByProfileId(profileId: string): Promise<void> {
    this.items = this.items.filter((i) => i.profileId !== profileId)
  }
}
