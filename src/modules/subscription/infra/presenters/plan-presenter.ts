import type { Plan } from '../../domain/entities/plan'

export class PlanPresenter {
  static toHTTP(plan: Plan) {
    return {
      id: plan.id.toValue(),
      name: plan.name,
      slug: plan.slug,
      priceCents: plan.priceCents,
      maxProfiles: plan.maxProfiles,
      maxStreams: plan.maxStreams,
      description: plan.description,
    }
  }
}
