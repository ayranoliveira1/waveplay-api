import { Entity } from '@/core/entities/entity'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { ActiveStream } from './active-stream'
import type { StreamContentType } from './active-stream'

export interface StreamSessionProps {
  userId: string
  profileId: string
  tmdbId: number
  type: StreamContentType
  startedAt: Date
  endedAt: Date
  durationSeconds: number
}

export class StreamSession extends Entity<StreamSessionProps> {
  get userId() {
    return this.props.userId
  }

  get profileId() {
    return this.props.profileId
  }

  get tmdbId() {
    return this.props.tmdbId
  }

  get type() {
    return this.props.type
  }

  get startedAt() {
    return this.props.startedAt
  }

  get endedAt() {
    return this.props.endedAt
  }

  get durationSeconds() {
    return this.props.durationSeconds
  }

  static createFromStream(stream: ActiveStream): StreamSession {
    const now = new Date()
    const durationSeconds = Math.floor(
      (now.getTime() - stream.startedAt.getTime()) / 1000,
    )

    return new StreamSession({
      userId: stream.userId,
      profileId: stream.profileId,
      tmdbId: stream.tmdbId,
      type: stream.type,
      startedAt: stream.startedAt,
      endedAt: now,
      durationSeconds,
    })
  }

  static create(props: StreamSessionProps, id?: UniqueEntityID) {
    return new StreamSession(props, id)
  }
}
