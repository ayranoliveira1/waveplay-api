import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { UserPlanGatewayPort } from '../../application/ports/user-plan-gateway.port'

@Injectable()
export class PrismaUserPlanGateway implements UserPlanGatewayPort {
  constructor(private prisma: PrismaService) {}

  async getMaxProfiles(userId: string): Promise<number> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      include: { plan: { select: { maxProfiles: true } } },
      orderBy: { startedAt: 'desc' },
    })

    return subscription?.plan?.maxProfiles ?? 1
  }
}
