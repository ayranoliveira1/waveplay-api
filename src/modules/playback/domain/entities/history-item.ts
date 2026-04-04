import { Entity } from '@/core/entities/entity'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'

export interface HistoryItemProps {
  profileId: string
  tmdbId: number
  type: string
  title: string
  posterPath: string | null
  season: number | null
  episode: number | null
  progressSeconds: number | null
  durationSeconds: number | null
  watchedAt: Date
}

export class HistoryItem extends Entity<HistoryItemProps> {
  get profileId() {
    return this.props.profileId
  }

  get tmdbId() {
    return this.props.tmdbId
  }

  get type() {
    return this.props.type
  }

  get title() {
    return this.props.title
  }

  get posterPath() {
    return this.props.posterPath
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

  get watchedAt() {
    return this.props.watchedAt
  }

  static create(
    props: Optional<
      HistoryItemProps,
      | 'watchedAt'
      | 'posterPath'
      | 'season'
      | 'episode'
      | 'progressSeconds'
      | 'durationSeconds'
    >,
    id?: UniqueEntityID,
  ) {
    return new HistoryItem(
      {
        ...props,
        posterPath: props.posterPath ?? null,
        season: props.season ?? null,
        episode: props.episode ?? null,
        progressSeconds: props.progressSeconds ?? null,
        durationSeconds: props.durationSeconds ?? null,
        watchedAt: props.watchedAt ?? new Date(),
      },
      id,
    )
  }
}
