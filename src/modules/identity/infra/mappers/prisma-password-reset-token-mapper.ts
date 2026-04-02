import { PasswordResetToken } from '../../domain/entities/password-reset-token'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { PasswordResetToken as PrismaPasswordResetToken } from '@/shared/database/generated/prisma'

export class PrismaPasswordResetTokenMapper {
  static toDomain(raw: PrismaPasswordResetToken): PasswordResetToken {
    return PasswordResetToken.create(
      {
        userId: raw.userId,
        tokenHash: raw.tokenHash,
        expiresAt: raw.expiresAt,
        usedAt: raw.usedAt,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(token: PasswordResetToken) {
    return {
      id: token.id.toValue(),
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    }
  }
}
