import type { RefreshToken } from '../entities/refresh-token'

export abstract class RefreshTokensRepository {
  abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>
  abstract create(token: RefreshToken): Promise<void>
  abstract revokeByTokenHash(tokenHash: string): Promise<void>
  abstract revokeAllByFamily(family: string): Promise<void>
  abstract revokeAllByUserId(userId: string): Promise<void>
}
