import { UseCaseError } from '@/core/errors/use-case-error'

export class ProfileNotFoundError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 404,
      errors: [{ message: 'Perfil não encontrado' }],
    })
  }
}
