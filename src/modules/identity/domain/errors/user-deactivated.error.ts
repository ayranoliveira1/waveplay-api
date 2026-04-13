import { UseCaseError } from '@/core/errors/use-case-error'

export class UserDeactivatedError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 401,
      errors: [{ message: 'Credenciais inválidas' }],
    })
  }
}
