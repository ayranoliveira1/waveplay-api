import { describe, expect, it } from 'vitest'
import { PrismaUserMapper } from './prisma-user-mapper'
import { User } from '../../domain/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { User as PrismaUser } from '@/shared/database/generated/prisma'

describe('PrismaUserMapper', () => {
  const now = new Date()

  const prismaUser: PrismaUser = {
    id: 'user-id-1',
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashed-password',
    planId: 'plan-id-1',
    createdAt: now,
    updatedAt: now,
  }

  it('should map prisma user to domain entity', () => {
    const user = PrismaUserMapper.toDomain(prismaUser)

    expect(user).toBeInstanceOf(User)
    expect(user.id.toValue()).toBe('user-id-1')
    expect(user.name).toBe('John Doe')
    expect(user.email).toBe('john@example.com')
    expect(user.passwordHash).toBe('hashed-password')
    expect(user.planId).toBe('plan-id-1')
    expect(user.createdAt).toEqual(now)
    expect(user.updatedAt).toEqual(now)
  })

  it('should map domain entity to prisma format', () => {
    const user = User.create(
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed-password',
        planId: 'plan-id-2',
        createdAt: now,
        updatedAt: now,
      },
      new UniqueEntityID('user-id-2'),
    )

    const data = PrismaUserMapper.toPrisma(user)

    expect(data.id).toBe('user-id-2')
    expect(data.name).toBe('Jane Doe')
    expect(data.email).toBe('jane@example.com')
    expect(data.passwordHash).toBe('hashed-password')
    expect(data.planId).toBe('plan-id-2')
    expect(data.createdAt).toEqual(now)
    expect(data.updatedAt).toEqual(now)
  })

  it('should preserve data on roundtrip', () => {
    const domain = PrismaUserMapper.toDomain(prismaUser)
    const data = PrismaUserMapper.toPrisma(domain)

    expect(data.id).toBe(prismaUser.id)
    expect(data.name).toBe(prismaUser.name)
    expect(data.email).toBe(prismaUser.email)
    expect(data.passwordHash).toBe(prismaUser.passwordHash)
    expect(data.planId).toBe(prismaUser.planId)
    expect(data.createdAt).toEqual(prismaUser.createdAt)
    expect(data.updatedAt).toEqual(prismaUser.updatedAt)
  })
})
