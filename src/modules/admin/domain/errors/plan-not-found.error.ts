import { UseCaseError } from '@/core/errors/use-case-error'

export class PlanNotFoundError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 404,
      errors: [{ message: 'Plano não encontrado' }],
    })
  }
}
