import { Entity } from '@/core/entities/entity'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'
import { createHash } from 'node:crypto'

export interface PasswordResetTokenProps {
  userId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export class PasswordResetToken extends Entity<PasswordResetTokenProps> {
  get userId() {
    return this.props.userId
  }

  get tokenHash() {
    return this.props.tokenHash
  }

  get expiresAt() {
    return this.props.expiresAt
  }

  get usedAt() {
    return this.props.usedAt
  }

  get createdAt() {
    return this.props.createdAt
  }

  isExpired(): boolean {
    return this.props.expiresAt < new Date()
  }

  isUsed(): boolean {
    return this.props.usedAt !== null
  }

  markAsUsed(): void {
    this.props.usedAt = new Date()
  }

  static create(
    props: Optional<PasswordResetTokenProps, 'createdAt' | 'usedAt'>,
    id?: UniqueEntityID,
  ) {
    return new PasswordResetToken(
      {
        ...props,
        usedAt: props.usedAt ?? null,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    )
  }

  static createFromRawToken(params: {
    rawToken: string
    userId: string
    expiresInMs: number
  }) {
    const tokenHash = createHash('sha256').update(params.rawToken).digest('hex')

    const passwordResetToken = PasswordResetToken.create({
      userId: params.userId,
      tokenHash,
      expiresAt: new Date(Date.now() + params.expiresInMs),
    })

    return { passwordResetToken, rawToken: params.rawToken }
  }
}
