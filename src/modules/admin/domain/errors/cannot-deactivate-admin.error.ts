import { UseCaseError } from '@/core/errors/use-case-error'

export class CannotDeactivateAdminError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 403,
      errors: [{ message: 'Não é permitido desativar um admin' }],
    })
  }
}
