import type { RefreshToken } from '@/modules/identity/domain/entities/refresh-token'
import type { RefreshTokensRepository } from '@/modules/identity/domain/repositories/refresh-tokens-repository'

export class InMemoryRefreshTokensRepository implements RefreshTokensRepository {
  public items: RefreshToken[] = []

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.items.find((token) => token.tokenHash === tokenHash) ?? null
  }

  async create(token: RefreshToken): Promise<void> {
    this.items.push(token)
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    const token = this.items.find((t) => t.tokenHash === tokenHash)
    if (token) {
      token.revoke()
    }
  }

  async revokeAllByFamily(family: string): Promise<void> {
    this.items
      .filter((t) => t.family === family && !t.isRevoked())
      .forEach((t) => t.revoke())
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    this.items
      .filter((t) => t.userId === userId && !t.isRevoked())
      .forEach((t) => t.revoke())
  }
}
