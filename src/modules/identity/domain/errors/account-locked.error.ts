import { UseCaseError } from '@/core/errors/use-case-error'

export class AccountLockedError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 429,
      errors: [{ message: 'Conta temporariamente bloqueada' }],
    })
  }
}
