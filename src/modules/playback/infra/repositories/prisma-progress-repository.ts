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

    await this.prisma.progress.upsert({
      where: {
        profileId_tmdbId_type_season_episode: {
          profileId: data.profileId,
          tmdbId: data.tmdbId,
          type: data.type,
          season: data.season ?? null,
          episode: data.episode ?? null,
        },
      },
      update: {
        progressSeconds: data.progressSeconds,
        durationSeconds: data.durationSeconds,
      },
      create: data,
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
