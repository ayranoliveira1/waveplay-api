import type { StreamSession } from '@/modules/subscription/domain/entities/stream-session'
import type { StreamSessionsRepository } from '@/modules/subscription/domain/repositories/stream-sessions-repository'

export class InMemoryStreamSessionsRepository implements StreamSessionsRepository {
  public items: StreamSession[] = []

  async create(session: StreamSession): Promise<void> {
    this.items.push(session)
  }

  async createMany(sessions: StreamSession[]): Promise<void> {
    this.items.push(...sessions)
  }
}
