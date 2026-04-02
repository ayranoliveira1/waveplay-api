import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Plan } from '../../domain/entities/plan'
import type { Plan as PrismaPlan } from '@/shared/database/generated/prisma'

export class PrismaPlanMapper {
  static toDomain(raw: PrismaPlan): Plan {
    return Plan.create(
      {
        name: raw.name,
        slug: raw.slug,
        priceCents: raw.priceCents,
        maxProfiles: raw.maxProfiles,
        maxStreams: raw.maxStreams,
        description: raw.description,
        active: raw.active,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(plan: Plan) {
    return {
      id: plan.id.toValue(),
      name: plan.name,
      slug: plan.slug,
      priceCents: plan.priceCents,
      maxProfiles: plan.maxProfiles,
      maxStreams: plan.maxStreams,
      description: plan.description,
      active: plan.active,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }
  }
}
