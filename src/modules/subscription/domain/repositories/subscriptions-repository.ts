import type { Subscription } from '../entities/subscription'

export abstract class SubscriptionsRepository {
  abstract findActiveByUserId(userId: string): Promise<Subscription | null>
  abstract create(subscription: Subscription): Promise<void>
  abstract save(subscription: Subscription): Promise<void>
}
