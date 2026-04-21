import { UseCaseError } from '@/core/errors/use-case-error'

export class PlanHasSubscriptionsError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 409,
      errors: [
        {
          message:
            'Plano possui assinaturas vinculadas. Desative o plano ao invés de excluir.',
        },
      ],
    })
  }
}
