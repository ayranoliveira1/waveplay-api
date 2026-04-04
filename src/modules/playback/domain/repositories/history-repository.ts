import type { HistoryItem } from '../entities/history-item'

export abstract class HistoryRepository {
  abstract upsertAndCleanup(item: HistoryItem, limit: number): Promise<void>
  abstract findByProfileId(
    profileId: string,
    page: number,
    perPage: number,
  ): Promise<HistoryItem[]>
  abstract countByProfileId(profileId: string): Promise<number>
  abstract deleteAllByProfileId(profileId: string): Promise<void>
}
