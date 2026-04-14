import { UseCaseError } from '@/core/errors/use-case-error'

export class CannotDeleteAdminError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 403,
      errors: [{ message: 'Não é permitido deletar um admin' }],
    })
  }
}
