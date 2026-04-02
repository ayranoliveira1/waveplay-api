import type { SubscriptionsRepository } from '@/modules/subscription/domain/repositories/subscriptions-repository'
import type { Subscription } from '@/modules/subscription/domain/entities/subscription'

export class InMemorySubscriptionsRepository implements SubscriptionsRepository {
  public items: Subscription[] = []

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return (
      this.items.find(
        (item) => item.userId === userId && item.status === 'active',
      ) ?? null
    )
  }

  async create(subscription: Subscription): Promise<void> {
    this.items.push(subscription)
  }

  async save(subscription: Subscription): Promise<void> {
    const index = this.items.findIndex((item) =>
      item.id.equals(subscription.id),
    )

    if (index >= 0) {
      this.items[index] = subscription
    }
  }
}
