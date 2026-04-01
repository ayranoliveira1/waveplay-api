import { Entity } from '@/core/entities/entity'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Optional } from '@/core/types/optional'

export interface UserProps {
  name: string
  email: string
  passwordHash: string
  planId: string | null
  createdAt: Date
  updatedAt: Date
}

export class User extends Entity<UserProps> {
  get name() {
    return this.props.name
  }

  set name(name: string) {
    this.props.name = name
    this.touch()
  }

  get email() {
    return this.props.email
  }

  set email(email: string) {
    this.props.email = email
    this.touch()
  }

  get passwordHash() {
    return this.props.passwordHash
  }

  set passwordHash(hash: string) {
    this.props.passwordHash = hash
    this.touch()
  }

  get planId() {
    return this.props.planId
  }

  set planId(planId: string | null) {
    this.props.planId = planId
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
    props: Optional<UserProps, 'createdAt' | 'updatedAt' | 'planId'>,
    id?: UniqueEntityID,
  ) {
    const user = new User(
      {
        ...props,
        planId: props.planId ?? null,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    )

    return user
  }
}
