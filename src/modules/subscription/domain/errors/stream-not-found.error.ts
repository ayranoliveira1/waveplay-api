import { UseCaseError } from '@/core/errors/use-case-error'

export class StreamNotFoundError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 404,
      errors: [{ message: 'Stream não encontrada' }],
    })
  }
}
