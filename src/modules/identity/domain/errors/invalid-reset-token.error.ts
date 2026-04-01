import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidResetTokenError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 401,
      errors: [{ message: 'Token inválido ou expirado' }],
    })
  }
}
