import { UseCaseError } from '@/core/errors/use-case-error'

export class TokenTheftDetectedError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 401,
      errors: [{ message: 'Token revogado — faça login novamente' }],
    })
  }
}
