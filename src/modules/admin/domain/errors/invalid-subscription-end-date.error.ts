import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidSubscriptionEndDateError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 400,
      errors: [{ message: 'Data de término deve ser futura' }],
    })
  }
}
