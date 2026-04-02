import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { RefreshToken } from '../../domain/entities/refresh-token'
import type { RefreshToken as PrismaRefreshToken } from '@/shared/database/generated/prisma'

export class PrismaRefreshTokenMapper {
  static toDomain(raw: PrismaRefreshToken): RefreshToken {
    return RefreshToken.create(
      {
        userId: raw.userId,
        tokenHash: raw.tokenHash,
        family: raw.family,
        expiresAt: raw.expiresAt,
        revokedAt: raw.revokedAt,
        ipAddress: raw.ipAddress,
        userAgent: raw.userAgent,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(token: RefreshToken) {
    return {
      id: token.id.toValue(),
      userId: token.userId,
      tokenHash: token.tokenHash,
      family: token.family,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      ipAddress: token.ipAddress,
      userAgent: token.userAgent,
      createdAt: token.createdAt,
    }
  }
}
