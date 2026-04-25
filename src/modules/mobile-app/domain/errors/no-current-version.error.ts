import { UseCaseError } from '@/core/errors/use-case-error'

export class NoCurrentVersionError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 404,
      errors: [
        {
          message: 'Nenhuma versao publicada',
          code: 'NO_CURRENT_VERSION',
        },
      ],
    })
  }
}
