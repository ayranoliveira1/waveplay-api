import { describe, expect, it } from 'vitest'
import { left, right } from './either'

function doSomething(shouldSuccess: boolean) {
  if (shouldSuccess) {
    return right({ value: 'success' })
  }
  return left({ error: 'error' })
}

describe('Either', () => {
  it('should return a Right result', () => {
    const result = doSomething(true)

    expect(result.isRight()).toBe(true)
    expect(result.isLeft()).toBe(false)
  })

  it('should return a Left result', () => {
    const result = doSomething(false)

    expect(result.isLeft()).toBe(true)
    expect(result.isRight()).toBe(false)
  })
})
