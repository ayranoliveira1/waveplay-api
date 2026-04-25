import { UseCaseError } from '@/core/errors/use-case-error'

export class CannotDeleteCurrentVersionError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 409,
      errors: [
        {
          message:
            'Nao e possivel excluir a versao atual. Promova outra versao primeiro.',
          code: 'CANNOT_DELETE_CURRENT_VERSION',
        },
      ],
    })
  }
}
