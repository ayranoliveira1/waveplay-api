import { UseCaseError } from '@/core/errors/use-case-error'

export class SamePasswordError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 400,
      errors: [{ message: 'A nova senha deve ser diferente da senha atual' }],
    })
  }
}
