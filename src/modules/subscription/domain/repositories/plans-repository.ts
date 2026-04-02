import type { Plan } from '../entities/plan'

export abstract class PlansRepository {
  abstract findById(id: string): Promise<Plan | null>
  abstract findBySlug(slug: string): Promise<Plan | null>
  abstract findAll(): Promise<Plan[]>
}
