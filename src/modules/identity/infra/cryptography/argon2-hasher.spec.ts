import { describe, expect, it } from 'vitest'
import { Argon2Hasher } from './argon2-hasher'

describe('Argon2Hasher', () => {
  const hasher = new Argon2Hasher()

  it('should hash a plain string', async () => {
    const hashed = await hasher.hash('my-password')

    expect(hashed).not.toBe('my-password')
    expect(hashed).toContain('$argon2id$')
  })

  it('should return true when comparing correct plain with hash', async () => {
    const hashed = await hasher.hash('my-password')
    const result = await hasher.compare('my-password', hashed)

    expect(result).toBe(true)
  })

  it('should return false when comparing wrong plain with hash', async () => {
    const hashed = await hasher.hash('my-password')
    const result = await hasher.compare('wrong-password', hashed)

    expect(result).toBe(false)
  })
})
