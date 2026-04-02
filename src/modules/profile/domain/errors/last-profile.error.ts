import { UseCaseError } from '@/core/errors/use-case-error'

export class LastProfileError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 403,
      errors: [{ message: 'Não é possível deletar o último perfil' }],
    })
  }
}
