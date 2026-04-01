import { describe, expect, it } from 'vitest'
import { User } from './user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

describe('User', () => {
  it('should create a user with default values', () => {
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
    })

    expect(user.name).toBe('John Doe')
    expect(user.email).toBe('john@example.com')
    expect(user.passwordHash).toBe('hashed-password')
    expect(user.planId).toBeNull()
    expect(user.createdAt).toBeInstanceOf(Date)
    expect(user.updatedAt).toBeInstanceOf(Date)
    expect(user.id).toBeDefined()
  })

  it('should create a user with a specific id', () => {
    const id = new UniqueEntityID('custom-id')

    const user = User.create(
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed-password',
      },
      id,
    )

    expect(user.id.toValue()).toBe('custom-id')
  })

  it('should update name and touch updatedAt', () => {
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
    })

    const previousUpdatedAt = user.updatedAt

    user.name = 'John Updated'

    expect(user.name).toBe('John Updated')
    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
      previousUpdatedAt.getTime(),
    )
  })

  it('should compare two users by id', () => {
    const id = new UniqueEntityID('same-id')

    const user1 = User.create(
      {
        name: 'User 1',
        email: 'user1@example.com',
        passwordHash: 'hash1',
      },
      id,
    )

    const user2 = User.create(
      {
        name: 'User 2',
        email: 'user2@example.com',
        passwordHash: 'hash2',
      },
      id,
    )

    expect(user1.equals(user2)).toBe(true)
  })

  it('should create a user with planId', () => {
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
      planId: 'plan-basico-id',
    })

    expect(user.planId).toBe('plan-basico-id')
  })
})
