import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidSemverError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 400,
      errors: [
        {
          message:
            'Versao deve seguir formato semver (X.Y.Z ou X.Y.Z-prerelease)',
          code: 'INVALID_SEMVER',
        },
      ],
    })
  }
}
