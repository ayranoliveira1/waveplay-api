import { UseCaseError } from '@/core/errors/use-case-error'

export class WeakPasswordError extends UseCaseError<never> {
  constructor() {
    super({
      statusCode: 400,
      errors: [
        {
          message:
            'Senha deve ter no mínimo 8 caracteres, incluindo 1 maiúscula, 1 minúscula e 1 número',
        },
      ],
    })
  }
}
