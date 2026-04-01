export interface PasswordResetTokenProps {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export abstract class PasswordResetTokensRepository {
  abstract findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenProps | null>
  abstract create(token: PasswordResetTokenProps): Promise<void>
  abstract markAsUsed(tokenHash: string): Promise<void>
}
