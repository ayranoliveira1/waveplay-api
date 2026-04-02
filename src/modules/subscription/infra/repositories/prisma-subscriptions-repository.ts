import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { Subscription } from '../../domain/entities/subscription'
import { SubscriptionsRepository } from '../../domain/repositories/subscriptions-repository'
import { PrismaSubscriptionMapper } from '../mappers/prisma-subscription-mapper'

@Injectable()
export class PrismaSubscriptionsRepository implements SubscriptionsRepository {
  constructor(private prisma: PrismaService) {}

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      orderBy: { startedAt: 'desc' },
    })

    if (!subscription) {
      return null
    }

    return PrismaSubscriptionMapper.toDomain(subscription)
  }

  async create(subscription: Subscription): Promise<void> {
    await this.prisma.subscription.create({
      data: PrismaSubscriptionMapper.toPrisma(subscription),
    })
  }

  async save(subscription: Subscription): Promise<void> {
    await this.prisma.subscription.update({
      where: { id: subscription.id.toValue() },
      data: PrismaSubscriptionMapper.toPrisma(subscription),
    })
  }
}
