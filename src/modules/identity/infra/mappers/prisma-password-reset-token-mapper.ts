import { PasswordResetTokenProps } from '../../domain/repositories/password-reset-tokens-repository'
import { PasswordResetToken as PrismaPasswordResetToken } from '@/shared/database/generated/prisma'

export class PrismaPasswordResetTokenMapper {
  static toDomain(raw: PrismaPasswordResetToken): PasswordResetTokenProps {
    return {
      id: raw.id,
      userId: raw.userId,
      tokenHash: raw.tokenHash,
      expiresAt: raw.expiresAt,
      usedAt: raw.usedAt,
      createdAt: raw.createdAt,
    }
  }

  static toPrisma(token: PasswordResetTokenProps) {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    }
  }
}
