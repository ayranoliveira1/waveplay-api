import { UseCaseError } from '@/core/errors/use-case-error'

export class SlugAlreadyExistsError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 409,
      errors: [{ message: 'Já existe um plano com este slug' }],
    })
  }
}
