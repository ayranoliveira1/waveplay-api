import { UseCaseError } from '@/core/errors/use-case-error'

export class UserStillActiveError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 409,
      errors: [{ message: 'Desative o usuário antes de deletar' }],
    })
  }
}
