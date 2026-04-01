import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidCredentialsError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 401,
      errors: [{ message: 'Credenciais inválidas' }],
    })
  }
}
