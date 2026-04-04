import { Entity } from '@/core/entities/entity'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'

export interface ProgressProps {
  profileId: string
  tmdbId: number
  type: string
  season: number | null
  episode: number | null
  progressSeconds: number
  durationSeconds: number
  updatedAt: Date
}

export class Progress extends Entity<ProgressProps> {
  get profileId() {
    return this.props.profileId
  }

  get tmdbId() {
    return this.props.tmdbId
  }

  get type() {
    return this.props.type
  }

  get season() {
    return this.props.season
  }

  get episode() {
    return this.props.episode
  }

  get progressSeconds() {
    return this.props.progressSeconds
  }

  get durationSeconds() {
    return this.props.durationSeconds
  }

  get updatedAt() {
    return this.props.updatedAt
  }

  static create(
    props: Optional<ProgressProps, 'updatedAt' | 'season' | 'episode'>,
    id?: UniqueEntityID,
  ) {
    return new Progress(
      {
        ...props,
        season: props.season ?? null,
        episode: props.episode ?? null,
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    )
  }
}
