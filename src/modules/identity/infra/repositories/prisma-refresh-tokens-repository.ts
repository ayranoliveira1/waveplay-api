import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { RefreshToken } from '../../domain/entities/refresh-token'
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens-repository'
import { PrismaRefreshTokenMapper } from '../mappers/prisma-refresh-token-mapper'

@Injectable()
export class PrismaRefreshTokensRepository implements RefreshTokensRepository {
  constructor(private prisma: PrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    })

    if (!token) {
      return null
    }

    return PrismaRefreshTokenMapper.toDomain(token)
  }

  async create(token: RefreshToken): Promise<void> {
    const data = PrismaRefreshTokenMapper.toPrisma(token)

    await this.prisma.refreshToken.create({ data })
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllByFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
