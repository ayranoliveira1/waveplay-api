import { Entity } from '@/core/entities/entity'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'

export interface FavoriteProps {
  profileId: string
  tmdbId: number
  type: string
  title: string
  posterPath: string | null
  backdropPath: string | null
  rating: number
  createdAt: Date
}

export class Favorite extends Entity<FavoriteProps> {
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

  get backdropPath() {
    return this.props.backdropPath
  }

  get rating() {
    return this.props.rating
  }

  get createdAt() {
    return this.props.createdAt
  }

  static create(
    props: Optional<FavoriteProps, 'createdAt' | 'posterPath' | 'backdropPath'>,
    id?: UniqueEntityID,
  ) {
    return new Favorite(
      {
        ...props,
        posterPath: props.posterPath ?? null,
        backdropPath: props.backdropPath ?? null,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    )
  }
}
