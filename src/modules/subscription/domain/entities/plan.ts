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

  set name(name: string) {
    this.props.name = name
    this.touch()
  }

  get slug() {
    return this.props.slug
  }

  get priceCents() {
    return this.props.priceCents
  }

  set priceCents(priceCents: number) {
    this.props.priceCents = priceCents
    this.touch()
  }

  get maxProfiles() {
    return this.props.maxProfiles
  }

  set maxProfiles(maxProfiles: number) {
    this.props.maxProfiles = maxProfiles
    this.touch()
  }

  get maxStreams() {
    return this.props.maxStreams
  }

  set maxStreams(maxStreams: number) {
    this.props.maxStreams = maxStreams
    this.touch()
  }

  get description() {
    return this.props.description
  }

  set description(description: string | null) {
    this.props.description = description
    this.touch()
  }

  get active() {
    return this.props.active
  }

  set active(active: boolean) {
    this.props.active = active
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
