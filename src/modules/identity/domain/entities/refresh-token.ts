import { Entity } from '@/core/entities/entity'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Optional } from '@/core/types/optional'
import { createHash, randomUUID } from 'node:crypto'

export interface RefreshTokenProps {
  userId: string
  tokenHash: string
  family: string
  expiresAt: Date
  revokedAt: Date | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export class RefreshToken extends Entity<RefreshTokenProps> {
  get userId() {
    return this.props.userId
  }

  get tokenHash() {
    return this.props.tokenHash
  }

  get family() {
    return this.props.family
  }

  get expiresAt() {
    return this.props.expiresAt
  }

  get revokedAt() {
    return this.props.revokedAt
  }

  get ipAddress() {
    return this.props.ipAddress
  }

  get userAgent() {
    return this.props.userAgent
  }

  get createdAt() {
    return this.props.createdAt
  }

  isExpired(): boolean {
    return this.props.expiresAt < new Date()
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null
  }

  revoke(): void {
    this.props.revokedAt = new Date()
  }

  static create(
    props: Optional<RefreshTokenProps, 'createdAt' | 'revokedAt'>,
    id?: UniqueEntityID,
  ) {
    return new RefreshToken(
      {
        ...props,
        revokedAt: props.revokedAt ?? null,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    )
  }

  static createFromRawToken(params: {
    rawToken: string
    userId: string
    expiresInMs: number
    family?: string
    ipAddress?: string
    userAgent?: string
  }) {
    const tokenHash = createHash('sha256')
      .update(params.rawToken)
      .digest('hex')

    const refreshToken = RefreshToken.create({
      userId: params.userId,
      tokenHash,
      family: params.family ?? randomUUID(),
      expiresAt: new Date(Date.now() + params.expiresInMs),
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    })

    return { refreshToken, rawToken: params.rawToken }
  }
}
