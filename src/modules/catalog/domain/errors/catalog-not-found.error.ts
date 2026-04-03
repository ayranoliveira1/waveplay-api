import { UseCaseError } from '@/core/errors/use-case-error'

export class CatalogNotFoundError extends UseCaseError<Record<string, never>> {
  constructor(type: string, id: number) {
    super({
      statusCode: 404,
      errors: [
        {
          message: `${type} with id ${id} not found`,
          code: 'CATALOG_NOT_FOUND',
        },
      ],
    })
  }
}
