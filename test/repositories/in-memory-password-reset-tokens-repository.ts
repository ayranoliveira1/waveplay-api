import { PasswordResetToken } from '@/modules/identity/domain/entities/password-reset-token'
import { PasswordResetTokensRepository } from '@/modules/identity/domain/repositories/password-reset-tokens-repository'

export class InMemoryPasswordResetTokensRepository
  implements PasswordResetTokensRepository
{
  public items: PasswordResetToken[] = []

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetToken | null> {
    return this.items.find((t) => t.tokenHash === tokenHash) ?? null
  }

  async create(token: PasswordResetToken): Promise<void> {
    this.items.push(token)
  }

  async markAsUsed(tokenHash: string): Promise<void> {
    const token = this.items.find((t) => t.tokenHash === tokenHash)

    if (token) {
      token.markAsUsed()
    }
  }
}
