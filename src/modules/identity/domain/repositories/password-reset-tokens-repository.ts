import { PasswordResetToken } from '../entities/password-reset-token'

export abstract class PasswordResetTokensRepository {
  abstract findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetToken | null>
  abstract create(token: PasswordResetToken): Promise<void>
  abstract markAsUsed(tokenHash: string): Promise<void>
}
