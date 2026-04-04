import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { WatchlistRepository } from '../../domain/repositories/watchlist-repository'
import type { WatchlistItem } from '../../domain/entities/watchlist-item'
import { PrismaWatchlistMapper } from '../mappers/prisma-watchlist-mapper'

@Injectable()
export class PrismaWatchlistRepository implements WatchlistRepository {
  constructor(private prisma: PrismaService) {}

  async findByProfileId(
    profileId: string,
    page: number,
    perPage: number,
  ): Promise<WatchlistItem[]> {
    const rows = await this.prisma.watchlistItem.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    })

    return rows.map(PrismaWatchlistMapper.toDomain)
  }

  async countByProfileId(profileId: string): Promise<number> {
    return this.prisma.watchlistItem.count({ where: { profileId } })
  }

  async findByProfileAndTmdb(
    profileId: string,
    tmdbId: number,
    type: string,
  ): Promise<WatchlistItem | null> {
    const row = await this.prisma.watchlistItem.findUnique({
      where: { profileId_tmdbId_type: { profileId, tmdbId, type } },
    })

    return row ? PrismaWatchlistMapper.toDomain(row) : null
  }

  async create(item: WatchlistItem): Promise<void> {
    await this.prisma.watchlistItem.create({
      data: PrismaWatchlistMapper.toPrisma(item),
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.watchlistItem.delete({ where: { id } })
  }
}
