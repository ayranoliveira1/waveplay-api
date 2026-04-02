import { Entity } from '@/core/entities/entity'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'

export interface ProfileProps {
  userId: string
  name: string
  avatarUrl: string | null
  isKid: boolean
  createdAt: Date
  updatedAt: Date
}

export class Profile extends Entity<ProfileProps> {
  get userId() {
    return this.props.userId
  }

  get name() {
    return this.props.name
  }

  set name(name: string) {
    this.props.name = name
    this.touch()
  }

  get avatarUrl() {
    return this.props.avatarUrl
  }

  set avatarUrl(avatarUrl: string | null) {
    this.props.avatarUrl = avatarUrl
    this.touch()
  }

  get isKid() {
    return this.props.isKid
  }

  set isKid(isKid: boolean) {
    this.props.isKid = isKid
    this.touch()
  }

  get createdAt() {
    return this.props.createdAt
  }

  get updatedAt() {
    return this.props.updatedAt
  }

  private touch() {
    this.props.updatedAt = new Date()
  }

  static create(
    props: Optional<
      ProfileProps,
      'createdAt' | 'updatedAt' | 'avatarUrl' | 'isKid'
    >,
    id?: UniqueEntityID,
  ) {
    return new Profile(
      {
        ...props,
        avatarUrl: props.avatarUrl ?? null,
        isKid: props.isKid ?? false,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    )
  }
}
