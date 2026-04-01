import { RefreshTokenProps } from '../../domain/repositories/refresh-tokens-repository'
import { RefreshToken as PrismaRefreshToken } from '@/shared/database/generated/prisma'

export class PrismaRefreshTokenMapper {
  static toDomain(raw: PrismaRefreshToken): RefreshTokenProps {
    return {
      id: raw.id,
      userId: raw.userId,
      tokenHash: raw.tokenHash,
      family: raw.family,
      expiresAt: raw.expiresAt,
      revokedAt: raw.revokedAt,
      ipAddress: raw.ipAddress,
      userAgent: raw.userAgent,
      createdAt: raw.createdAt,
    }
  }

  static toPrisma(token: RefreshTokenProps) {
    return {
      id: token.id,
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
