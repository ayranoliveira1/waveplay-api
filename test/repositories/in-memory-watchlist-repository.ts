import type { WatchlistItem } from '@/modules/library/domain/entities/watchlist-item'
import type { WatchlistRepository } from '@/modules/library/domain/repositories/watchlist-repository'

export class InMemoryWatchlistRepository implements WatchlistRepository {
  public items: WatchlistItem[] = []

  async findByProfileId(
    profileId: string,
    page: number,
    perPage: number,
  ): Promise<WatchlistItem[]> {
    const filtered = this.items
      .filter((item) => item.profileId === profileId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return filtered.slice((page - 1) * perPage, page * perPage)
  }

  async countByProfileId(profileId: string): Promise<number> {
    return this.items.filter((item) => item.profileId === profileId).length
  }

  async findByProfileAndTmdb(
    profileId: string,
    tmdbId: number,
    type: string,
  ): Promise<WatchlistItem | null> {
    return (
      this.items.find(
        (item) =>
          item.profileId === profileId &&
          item.tmdbId === tmdbId &&
          item.type === type,
      ) ?? null
    )
  }

  async toggle(item: WatchlistItem): Promise<boolean> {
    const index = this.items.findIndex(
      (i) =>
        i.profileId === item.profileId &&
        i.tmdbId === item.tmdbId &&
        i.type === item.type,
    )

    if (index >= 0) {
      this.items.splice(index, 1)
      return false
    }

    this.items.push(item)
    return true
  }

  async create(item: WatchlistItem): Promise<void> {
    this.items.push(item)
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id.toValue() !== id)
  }
}
