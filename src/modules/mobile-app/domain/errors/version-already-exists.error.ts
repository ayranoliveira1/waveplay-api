import { UseCaseError } from '@/core/errors/use-case-error'

export class VersionAlreadyExistsError extends UseCaseError<never> {
  constructor(version: string) {
    super({
      statusCode: 409,
      errors: [
        {
          message: `Versao ${version} ja existe`,
          code: 'VERSION_ALREADY_EXISTS',
        },
      ],
    })
  }
}
