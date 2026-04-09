import type { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import type { Plan } from '@/modules/subscription/domain/entities/plan'

export class InMemoryPlansRepository implements PlansRepository {
  public items: Plan[] = []

  async findById(id: string): Promise<Plan | null> {
    return this.items.find((item) => item.id.toValue() === id) ?? null
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    return this.items.find((item) => item.slug === slug) ?? null
  }

  async findAll(): Promise<Plan[]> {
    return this.items.filter((item) => item.active)
  }

  async create(plan: Plan): Promise<void> {
    this.items.push(plan)
  }

  async save(plan: Plan): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(plan.id))
    if (index >= 0) {
      this.items[index] = plan
    }
  }
}
