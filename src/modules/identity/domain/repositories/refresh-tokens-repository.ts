export interface RefreshTokenProps {
  id: string
  userId: string
  tokenHash: string
  family: string
  expiresAt: Date
  revokedAt: Date | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export abstract class RefreshTokensRepository {
  abstract findByTokenHash(tokenHash: string): Promise<RefreshTokenProps | null>
  abstract create(token: RefreshTokenProps): Promise<void>
  abstract revokeByTokenHash(tokenHash: string): Promise<void>
  abstract revokeAllByFamily(family: string): Promise<void>
  abstract revokeAllByUserId(userId: string): Promise<void>
}
