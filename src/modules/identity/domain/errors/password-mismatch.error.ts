import { UseCaseError } from '@/core/errors/use-case-error'

export class PasswordMismatchError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 400,
      errors: [{ message: 'As senhas não coincidem' }],
    })
  }
}
