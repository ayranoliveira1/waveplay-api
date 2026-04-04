import type { Progress } from '../entities/progress'

export abstract class ProgressRepository {
  abstract upsert(progress: Progress): Promise<void>
  abstract findContinueWatching(profileId: string): Promise<Progress[]>
  abstract countContinueWatching(profileId: string): Promise<number>
}
