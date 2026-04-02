import { Entity } from '@/core/entities/entity'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'

export interface SubscriptionProps {
  userId: string
  planId: string
  status: string
  startedAt: Date
  endsAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class Subscription extends Entity<SubscriptionProps> {
  get userId() {
    return this.props.userId
  }

  get planId() {
    return this.props.planId
  }

  set planId(planId: string) {
    this.props.planId = planId
    this.touch()
  }

  get status() {
    return this.props.status
  }

  set status(status: string) {
    this.props.status = status
    this.touch()
  }

  get startedAt() {
    return this.props.startedAt
  }

  get endsAt() {
    return this.props.endsAt
  }

  set endsAt(endsAt: Date | null) {
    this.props.endsAt = endsAt
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
      SubscriptionProps,
      'createdAt' | 'updatedAt' | 'startedAt' | 'endsAt' | 'status'
    >,
    id?: UniqueEntityID,
  ) {
    return new Subscription(
      {
        ...props,
        status: props.status ?? 'active',
        startedAt: props.startedAt ?? new Date(),
        endsAt: props.endsAt ?? null,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    )
  }
}
