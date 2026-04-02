import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import {
  PlanProps,
  PlansGatewayPort,
} from '../../application/ports/plans-gateway.port'

@Injectable()
export class PrismaPlansGateway implements PlansGatewayPort {
  constructor(private prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<PlanProps | null> {
    const plan = await this.prisma.plan.findUnique({
      where: { slug },
    })

    if (!plan) {
      return null
    }

    return {
      id: plan.id,
      slug: plan.slug,
    }
  }
}
