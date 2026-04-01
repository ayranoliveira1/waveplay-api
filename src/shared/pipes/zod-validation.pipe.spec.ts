import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ZodValidationPipe } from './zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })

  const pipe = new ZodValidationPipe(schema)

  it('should return parsed value when validation succeeds', () => {
    const input = { name: 'John', email: 'john@example.com' }
    const result = pipe.transform(input)

    expect(result).toEqual(input)
  })

  it('should throw CustomHttpException with formatted errors on validation failure', () => {
    const input = { name: '', email: 'invalid' }

    expect(() => pipe.transform(input)).toThrow(CustomHttpException)

    try {
      pipe.transform(input)
    } catch (error) {
      const exception = error as CustomHttpException
      expect(exception.getStatus()).toBe(400)

      const response = exception.getResponse() as any
      expect(response.errors).toHaveLength(2)
      expect(response.errors[0]).toHaveProperty('message')
      expect(response.errors[0]).toHaveProperty('path')
    }
  })

  it('should reject unknown fields with strict schema', () => {
    const strictSchema = z
      .object({
        name: z.string(),
      })
      .strict()

    const strictPipe = new ZodValidationPipe(strictSchema)

    expect(() => strictPipe.transform({ name: 'John', role: 'admin' })).toThrow(
      CustomHttpException,
    )
  })
})
