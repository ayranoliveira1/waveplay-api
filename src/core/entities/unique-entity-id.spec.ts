import { describe, expect, it } from 'vitest'
import { UniqueEntityID } from './unique-entity-id'

describe('UniqueEntityID', () => {
  it('should generate a valid uuidv7 when no value is provided', () => {
    const id = new UniqueEntityID()

    expect(id.toValue()).toBeDefined()
    expect(id.toValue()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('should use the provided value', () => {
    const id = new UniqueEntityID('custom-id')

    expect(id.toValue()).toBe('custom-id')
    expect(id.toString()).toBe('custom-id')
  })

  it('should correctly compare two equal IDs', () => {
    const id1 = new UniqueEntityID('same-id')
    const id2 = new UniqueEntityID('same-id')

    expect(id1.equals(id2)).toBe(true)
  })

  it('should correctly compare two different IDs', () => {
    const id1 = new UniqueEntityID()
    const id2 = new UniqueEntityID()

    expect(id1.equals(id2)).toBe(false)
  })
})
