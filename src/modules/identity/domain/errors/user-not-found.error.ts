import { UseCaseError } from '@/core/errors/use-case-error'

export class UserNotFoundError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 404,
      errors: [{ message: 'Usuário não encontrado' }],
    })
  }
}
