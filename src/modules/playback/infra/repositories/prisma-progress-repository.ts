import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { ProgressRepository } from '../../domain/repositories/progress-repository'
import type { Progress } from '../../domain/entities/progress'
import { PrismaProgressMapper } from '../mappers/prisma-progress-mapper'

@Injectable()
export class PrismaProgressRepository implements ProgressRepository {
  constructor(private prisma: PrismaService) {}

  async upsert(progress: Progress): Promise<void> {
    const data = PrismaProgressMapper.toPrisma(progress)

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.progress.findFirst({
        where: {
          profileId: data.profileId,
          tmdbId: data.tmdbId,
          type: data.type,
          season: data.season,
          episode: data.episode,
        },
      })

      if (existing) {
        await tx.progress.update({
          where: { id: existing.id },
          data: {
            progressSeconds: data.progressSeconds,
            durationSeconds: data.durationSeconds,
          },
        })
      } else {
        await tx.progress.create({ data })
      }
    })
  }

  async findContinueWatching(profileId: string): Promise<Progress[]> {
    const rows = await this.prisma.progress.findMany({
      where: { profileId, progressSeconds: { gt: 0 } },
      orderBy: { updatedAt: 'desc' },
    })

    return rows
      .filter((row) => row.progressSeconds < row.durationSeconds * 0.9)
      .map(PrismaProgressMapper.toDomain)
  }

  async countContinueWatching(profileId: string): Promise<number> {
    const rows = await this.prisma.progress.findMany({
      where: { profileId, progressSeconds: { gt: 0 } },
      select: { progressSeconds: true, durationSeconds: true },
    })

    return rows.filter((row) => row.progressSeconds < row.durationSeconds * 0.9)
      .length
  }
}
