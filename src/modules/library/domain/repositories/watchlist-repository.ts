import type { WatchlistItem } from '../entities/watchlist-item'

export abstract class WatchlistRepository {
  abstract findByProfileId(
    profileId: string,
    page: number,
    perPage: number,
  ): Promise<WatchlistItem[]>
  abstract countByProfileId(profileId: string): Promise<number>
  abstract findByProfileAndTmdb(
    profileId: string,
    tmdbId: number,
    type: string,
  ): Promise<WatchlistItem | null>
  abstract toggle(item: WatchlistItem): Promise<boolean>
  abstract create(item: WatchlistItem): Promise<void>
  abstract delete(id: string): Promise<void>
}
