import type { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import type { Plan } from '@/modules/subscription/domain/entities/plan'
import type { InMemorySubscriptionsRepository } from './in-memory-subscriptions-repository'

export class InMemoryPlansRepository implements PlansRepository {
  public items: Plan[] = []

  constructor(
    private subscriptionsRepository?: InMemorySubscriptionsRepository,
  ) {}

  async findById(id: string): Promise<Plan | null> {
    return this.items.find((item) => item.id.toValue() === id) ?? null
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    return this.items.find((item) => item.slug === slug) ?? null
  }

  async findAll(): Promise<Plan[]> {
    return this.items.filter((item) => item.active)
  }

  async findAllAdmin(): Promise<Plan[]> {
    return [...this.items]
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

  async countSubscriptionsByPlanId(planId: string): Promise<number> {
    if (!this.subscriptionsRepository) return 0
    return this.subscriptionsRepository.items.filter((s) => s.planId === planId)
      .length
  }

  async delete(planId: string): Promise<void> {
    const index = this.items.findIndex((p) => p.id.toValue() === planId)
    if (index >= 0) this.items.splice(index, 1)
  }
}
