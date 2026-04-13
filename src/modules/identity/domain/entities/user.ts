import { AggregateRoot } from '@/core/entities/aggregate-root'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface UserProps {
  name: string
  email: string
  passwordHash: string
  role: UserRole
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export class User extends AggregateRoot<UserProps> {
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

  get role() {
    return this.props.role
  }

  get active() {
    return this.props.active
  }

  get createdAt() {
    return this.props.createdAt
  }

  get updatedAt() {
    return this.props.updatedAt
  }

  deactivate() {
    if (!this.props.active) return
    this.props.active = false
    this.touch()
  }

  activate() {
    if (this.props.active) return
    this.props.active = true
    this.touch()
  }

  private touch() {
    this.props.updatedAt = new Date()
  }

  static create(
    props: Optional<UserProps, 'createdAt' | 'updatedAt' | 'role' | 'active'>,
    id?: UniqueEntityID,
  ) {
    const user = new User(
      {
        ...props,
        role: props.role ?? UserRole.USER,
        active: props.active ?? true,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    )

    return user
  }
}
