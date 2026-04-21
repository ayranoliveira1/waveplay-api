import type { Plan } from '@/modules/subscription/domain/entities/plan'

export class AdminPlanPresenter {
  static toHTTP(plan: Plan, usersCount?: number) {
    return {
      id: plan.id.toValue(),
      name: plan.name,
      slug: plan.slug,
      priceCents: plan.priceCents,
      maxProfiles: plan.maxProfiles,
      maxStreams: plan.maxStreams,
      description: plan.description,
      active: plan.active,
      ...(usersCount !== undefined ? { usersCount } : {}),
    }
  }
}
