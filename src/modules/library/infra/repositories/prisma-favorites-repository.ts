import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { FavoritesRepository } from '../../domain/repositories/favorites-repository'
import type { Favorite } from '../../domain/entities/favorite'
import { PrismaFavoriteMapper } from '../mappers/prisma-favorite-mapper'

@Injectable()
export class PrismaFavoritesRepository implements FavoritesRepository {
  constructor(private prisma: PrismaService) {}

  async findByProfileId(
    profileId: string,
    page: number,
    perPage: number,
  ): Promise<Favorite[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    })

    return rows.map(PrismaFavoriteMapper.toDomain)
  }

  async countByProfileId(profileId: string): Promise<number> {
    return this.prisma.favorite.count({ where: { profileId } })
  }

  async findByProfileAndTmdb(
    profileId: string,
    tmdbId: number,
    type: string,
  ): Promise<Favorite | null> {
    const row = await this.prisma.favorite.findUnique({
      where: { profileId_tmdbId_type: { profileId, tmdbId, type } },
    })

    return row ? PrismaFavoriteMapper.toDomain(row) : null
  }

  async toggle(favorite: Favorite): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.favorite.findUnique({
        where: {
          profileId_tmdbId_type: {
            profileId: favorite.profileId,
            tmdbId: favorite.tmdbId,
            type: favorite.type,
          },
        },
      })

      if (existing) {
        await tx.favorite.delete({ where: { id: existing.id } })
        return false
      }

      await tx.favorite.create({
        data: PrismaFavoriteMapper.toPrisma(favorite),
      })
      return true
    })
  }

  async create(favorite: Favorite): Promise<void> {
    await this.prisma.favorite.create({
      data: PrismaFavoriteMapper.toPrisma(favorite),
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.favorite.delete({ where: { id } })
  }
}
