import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { UserPlanGatewayPort } from '../../application/ports/user-plan-gateway.port'

@Injectable()
export class PrismaUserPlanGateway implements UserPlanGatewayPort {
  constructor(private prisma: PrismaService) {}

  async getMaxProfiles(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { plan: { select: { maxProfiles: true } } },
    })

    return user?.plan?.maxProfiles ?? 1
  }
}
