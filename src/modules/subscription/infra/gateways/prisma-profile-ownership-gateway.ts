import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { ProfileOwnershipGatewayPort } from '../../application/ports/profile-ownership-gateway.port'

@Injectable()
export class PrismaProfileOwnershipGateway implements ProfileOwnershipGatewayPort {
  constructor(private prisma: PrismaService) {}

  async validateOwnership(profileId: string, userId: string): Promise<boolean> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    })

    return profile?.userId === userId
  }

  async getProfileName(profileId: string): Promise<string | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { name: true },
    })

    return profile?.name ?? null
  }
}
