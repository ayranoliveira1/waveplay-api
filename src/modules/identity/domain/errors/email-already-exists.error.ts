import { UseCaseError } from '@/core/errors/use-case-error'

export class EmailAlreadyExistsError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 409,
      errors: [{ message: 'Email já cadastrado' }],
    })
  }
}
