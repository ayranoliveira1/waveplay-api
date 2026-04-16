import { UseCaseError } from '@/core/errors/use-case-error'

export class SubscriptionNotFoundError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 404,
      errors: [{ message: 'Usuário não possui subscription ativa' }],
    })
  }
}
