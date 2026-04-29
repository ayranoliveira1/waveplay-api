import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidCurrentPasswordError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 401,
      errors: [{ message: 'Senha atual incorreta' }],
    })
  }
}
