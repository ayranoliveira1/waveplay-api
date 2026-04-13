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

  it('should default active to true on create', () => {
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
    })

    expect(user.active).toBe(true)
  })

  it('should deactivate the user and touch updatedAt', async () => {
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
    })

    const previousUpdatedAt = user.updatedAt

    await new Promise((resolve) => setTimeout(resolve, 5))
    user.deactivate()

    expect(user.active).toBe(false)
    expect(user.updatedAt.getTime()).toBeGreaterThan(
      previousUpdatedAt.getTime(),
    )
  })

  it('should activate a previously deactivated user and touch updatedAt', async () => {
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
      active: false,
    })

    const previousUpdatedAt = user.updatedAt

    await new Promise((resolve) => setTimeout(resolve, 5))
    user.activate()

    expect(user.active).toBe(true)
    expect(user.updatedAt.getTime()).toBeGreaterThan(
      previousUpdatedAt.getTime(),
    )
  })

  it('should be a no-op when deactivating an already inactive user', () => {
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
      active: false,
    })

    const previousUpdatedAt = user.updatedAt

    user.deactivate()

    expect(user.active).toBe(false)
    expect(user.updatedAt.getTime()).toBe(previousUpdatedAt.getTime())
  })

  it('should be a no-op when activating an already active user', () => {
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
    })

    const previousUpdatedAt = user.updatedAt

    user.activate()

    expect(user.active).toBe(true)
    expect(user.updatedAt.getTime()).toBe(previousUpdatedAt.getTime())
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
})
