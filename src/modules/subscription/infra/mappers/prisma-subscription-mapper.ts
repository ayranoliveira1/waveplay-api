import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Subscription } from '../../domain/entities/subscription'
import type { Subscription as PrismaSubscription } from '@/shared/database/generated/prisma'

export class PrismaSubscriptionMapper {
  static toDomain(raw: PrismaSubscription): Subscription {
    return Subscription.create(
      {
        userId: raw.userId,
        planId: raw.planId,
        status: raw.status,
        startedAt: raw.startedAt,
        endsAt: raw.endsAt,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(subscription: Subscription) {
    return {
      id: subscription.id.toValue(),
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      startedAt: subscription.startedAt,
      endsAt: subscription.endsAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    }
  }
}
