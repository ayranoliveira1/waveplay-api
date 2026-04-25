import { UseCaseError } from '@/core/errors/use-case-error'

export class VersionNotFoundError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 404,
      errors: [{ message: 'Versao nao encontrada' }],
    })
  }
}
