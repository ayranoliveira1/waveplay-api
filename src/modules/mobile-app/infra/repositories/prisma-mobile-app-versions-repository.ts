import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'
import { PrismaMobileAppVersionMapper } from '../mappers/prisma-mobile-app-version-mapper'

@Injectable()
export class PrismaMobileAppVersionsRepository implements MobileAppVersionsRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<MobileAppVersion | null> {
    const row = await this.prisma.mobileAppVersion.findUnique({ where: { id } })
    return row ? PrismaMobileAppVersionMapper.toDomain(row) : null
  }

  async findByVersion(version: string): Promise<MobileAppVersion | null> {
    const row = await this.prisma.mobileAppVersion.findUnique({
      where: { version },
    })
    return row ? PrismaMobileAppVersionMapper.toDomain(row) : null
  }

  async findCurrent(): Promise<MobileAppVersion | null> {
    const row = await this.prisma.mobileAppVersion.findFirst({
      where: { isCurrent: true },
    })
    return row ? PrismaMobileAppVersionMapper.toDomain(row) : null
  }

  async findAll(): Promise<MobileAppVersion[]> {
    const rows = await this.prisma.mobileAppVersion.findMany({
      orderBy: { publishedAt: 'desc' },
    })
    return rows.map(PrismaMobileAppVersionMapper.toDomain)
  }

  async create(version: MobileAppVersion): Promise<void> {
    const data = PrismaMobileAppVersionMapper.toPrisma(version)
    await this.prisma.mobileAppVersion.create({ data })
  }

  async save(version: MobileAppVersion): Promise<void> {
    const data = PrismaMobileAppVersionMapper.toPrisma(version)
    await this.prisma.mobileAppVersion.update({
      where: { id: data.id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mobileAppVersion.delete({ where: { id } })
  }

  async setCurrent(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.mobileAppVersion.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      }),
      this.prisma.mobileAppVersion.update({
        where: { id },
        data: { isCurrent: true },
      }),
    ])
  }
}
