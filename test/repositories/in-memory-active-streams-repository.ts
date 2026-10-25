import { ActiveStream } from '@/modules/subscription/domain/entities/active-stream'
import type { ActiveStreamsRepository } from '@/modules/subscription/domain/repositories/active-streams-repository'
import { MaxStreamsReachedError } from '@/modules/subscription/domain/errors/max-streams-reached.error'
import { STREAM_TIMEOUT_MS } from '@/modules/subscription/domain/constants/stream-timeout'

export class InMemoryActiveStreamsRepository implements ActiveStreamsRepository {
  public items: ActiveStream[] = []

  async findById(id: string): Promise<ActiveStream | null> {
    return this.items.find((item) => item.id.toValue() === id) ?? null
  }

  async findByUserAndProfile(
    userId: string,
    profileId: string,
  ): Promise<ActiveStream | null> {
    return (
      this.items.find(
        (item) => item.userId === userId && item.profileId === profileId,
      ) ?? null
    )
  }

  async createOrUpdate(
    stream: ActiveStream,
    maxStreams: number,
  ): Promise<ActiveStream> {
    const threshold = new Date(Date.now() - STREAM_TIMEOUT_MS)

    const activeCount = this.items.filter(
      (item) =>
        item.userId === stream.userId &&
        item.lastPing >= threshold &&
        !(item.userId === stream.userId && item.profileId === stream.profileId),
    ).length

    if (activeCount >= maxStreams) {
      throw new MaxStreamsReachedError(maxStreams)
    }

    const existingIndex = this.items.findIndex(
      (item) =>
        item.userId === stream.userId && item.profileId === stream.profileId,
    )

    if (existingIndex < 0) {
      this.items.push(stream)
      return stream
    }

    const updated = ActiveStream.create(
      {
        userId: stream.userId,
        profileId: stream.profileId,
        tmdbId: stream.tmdbId,
        type: stream.type,
        startedAt: stream.startedAt,
        lastPing: stream.lastPing,
      },
      this.items[existingIndex].id,
    )
    this.items[existingIndex] = updated
    return updated
  }

  async updatePing(id: string, lastPing: Date): Promise<void> {
    const item = this.items.find((item) => item.id.toValue() === id)
    if (item) {
      item.lastPing = lastPing
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id.toValue() !== id)
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    this.items = this.items.filter((item) => item.userId !== userId)
  }

  async findExpired(threshold: Date): Promise<ActiveStream[]> {
    return this.items.filter((item) => item.lastPing < threshold)
  }

  async deleteExpired(threshold: Date): Promise<number> {
    const before = this.items.length
    this.items = this.items.filter((item) => item.lastPing >= threshold)
    return before - this.items.length
  }
}
