import {
  RefreshTokenProps,
  RefreshTokensRepository,
} from '@/modules/identity/domain/repositories/refresh-tokens-repository'

export class InMemoryRefreshTokensRepository
  implements RefreshTokensRepository
{
  public items: RefreshTokenProps[] = []

  async findByTokenHash(
    tokenHash: string,
  ): Promise<RefreshTokenProps | null> {
    return (
      this.items.find((token) => token.tokenHash === tokenHash) ?? null
    )
  }

  async create(token: RefreshTokenProps): Promise<void> {
    this.items.push(token)
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    const token = this.items.find((t) => t.tokenHash === tokenHash)
    if (token) {
      token.revokedAt = new Date()
    }
  }

  async revokeAllByFamily(family: string): Promise<void> {
    this.items
      .filter((t) => t.family === family && !t.revokedAt)
      .forEach((t) => {
        t.revokedAt = new Date()
      })
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    this.items
      .filter((t) => t.userId === userId && !t.revokedAt)
      .forEach((t) => {
        t.revokedAt = new Date()
      })
  }
}
