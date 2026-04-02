import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { Plan } from '../../domain/entities/plan'
import { PlansRepository } from '../../domain/repositories/plans-repository'
import { PrismaPlanMapper } from '../mappers/prisma-plan-mapper'

@Injectable()
export class PrismaPlansRepository implements PlansRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Plan | null> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    })

    if (!plan) {
      return null
    }

    return PrismaPlanMapper.toDomain(plan)
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    const plan = await this.prisma.plan.findUnique({
      where: { slug },
    })

    if (!plan) {
      return null
    }

    return PrismaPlanMapper.toDomain(plan)
  }

  async findAll(): Promise<Plan[]> {
    const plans = await this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { priceCents: 'asc' },
    })

    return plans.map((plan) => PrismaPlanMapper.toDomain(plan))
  }
}
