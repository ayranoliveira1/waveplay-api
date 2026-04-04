import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { HistoryRepository } from '../../domain/repositories/history-repository'
import type { HistoryItem } from '../../domain/entities/history-item'
import { PrismaHistoryMapper } from '../mappers/prisma-history-mapper'

@Injectable()
export class PrismaHistoryRepository implements HistoryRepository {
  constructor(private prisma: PrismaService) {}

  async upsertAndCleanup(item: HistoryItem, limit: number): Promise<void> {
    const data = PrismaHistoryMapper.toPrisma(item)

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.historyItem.findFirst({
        where: {
          profileId: data.profileId,
          tmdbId: data.tmdbId,
          type: data.type,
          season: data.season,
          episode: data.episode,
        },
      })

      if (existing) {
        await tx.historyItem.update({
          where: { id: existing.id },
          data: {
            watchedAt: new Date(),
            progressSeconds: data.progressSeconds,
            durationSeconds: data.durationSeconds,
          },
        })
      } else {
        await tx.historyItem.create({ data })
      }

      const count = await tx.historyItem.count({
        where: { profileId: data.profileId },
      })

      if (count > limit) {
        const toKeep = await tx.historyItem.findMany({
          where: { profileId: data.profileId },
          orderBy: { watchedAt: 'desc' },
          take: limit,
          select: { id: true },
        })

        const keepIds = toKeep.map((i) => i.id)

        await tx.historyItem.deleteMany({
          where: { profileId: data.profileId, id: { notIn: keepIds } },
        })
      }
    })
  }

  async findByProfileId(
    profileId: string,
    page: number,
    perPage: number,
  ): Promise<HistoryItem[]> {
    const rows = await this.prisma.historyItem.findMany({
      where: { profileId },
      orderBy: { watchedAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    })

    return rows.map(PrismaHistoryMapper.toDomain)
  }

  async countByProfileId(profileId: string): Promise<number> {
    return this.prisma.historyItem.count({ where: { profileId } })
  }

  async deleteAllByProfileId(profileId: string): Promise<void> {
    await this.prisma.historyItem.deleteMany({ where: { profileId } })
  }
}
