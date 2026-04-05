import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import {
  AccountGatewayPort,
  type AccountSubscriptionData,
} from '../../application/ports/account-gateway.port'

@Injectable()
export class PrismaAccountGateway implements AccountGatewayPort {
  constructor(private prisma: PrismaService) {}

  async getSubscription(
    userId: string,
  ): Promise<AccountSubscriptionData | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            slug: true,
            maxProfiles: true,
            maxStreams: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    if (!subscription) return null

    return {
      id: subscription.id,
      status: subscription.status,
      startedAt: subscription.startedAt,
      endsAt: subscription.endsAt,
      plan: subscription.plan,
    }
  }
}
