import { UseCaseError } from '@/core/errors/use-case-error'

export class MaxProfilesReachedError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 403,
      errors: [{ message: 'Limite de perfis atingido para o seu plano' }],
    })
  }
}
