import { Entity } from '@/core/entities/entity'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'

export type StreamContentType = 'movie' | 'series'

export interface ActiveStreamProps {
  userId: string
  profileId: string
  tmdbId: number
  type: StreamContentType
  startedAt: Date
  lastPing: Date
}

export class ActiveStream extends Entity<ActiveStreamProps> {
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

  get lastPing() {
    return this.props.lastPing
  }

  set lastPing(lastPing: Date) {
    this.props.lastPing = lastPing
  }

  static create(
    props: Optional<ActiveStreamProps, 'startedAt' | 'lastPing'>,
    id?: UniqueEntityID,
  ) {
    return new ActiveStream(
      {
        ...props,
        startedAt: props.startedAt ?? new Date(),
        lastPing: props.lastPing ?? new Date(),
      },
      id,
    )
  }
}
