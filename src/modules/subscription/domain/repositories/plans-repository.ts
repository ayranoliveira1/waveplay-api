import type { Plan } from '../entities/plan'

export abstract class PlansRepository {
  abstract findById(id: string): Promise<Plan | null>
  abstract findBySlug(slug: string): Promise<Plan | null>
  abstract findAll(): Promise<Plan[]>
  abstract findAllAdmin(): Promise<Plan[]>
  abstract create(plan: Plan): Promise<void>
  abstract save(plan: Plan): Promise<void>
  abstract countSubscriptionsByPlanId(planId: string): Promise<number>
  abstract delete(planId: string): Promise<void>
}
