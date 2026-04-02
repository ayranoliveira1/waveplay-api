import { Entity } from '@/core/entities/entity'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'

export interface PlanProps {
  name: string
  slug: string
  priceCents: number
  maxProfiles: number
  maxStreams: number
  description: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export class Plan extends Entity<PlanProps> {
  get name() {
    return this.props.name
  }

  get slug() {
    return this.props.slug
  }

  get priceCents() {
    return this.props.priceCents
  }

  get maxProfiles() {
    return this.props.maxProfiles
  }

  get maxStreams() {
    return this.props.maxStreams
  }

  get description() {
    return this.props.description
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

  static create(
    props: Optional<
      PlanProps,
      'createdAt' | 'updatedAt' | 'description' | 'active'
    >,
    id?: UniqueEntityID,
  ) {
    return new Plan(
      {
        ...props,
        description: props.description ?? null,
        active: props.active ?? true,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    )
  }
}
