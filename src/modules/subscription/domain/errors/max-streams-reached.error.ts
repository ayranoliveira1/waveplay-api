import { UseCaseError } from '@/core/errors/use-case-error'

export class MaxStreamsReachedError extends UseCaseError<never> {
  constructor(maxStreams: number) {
    super({
      statusCode: 403,
      errors: [
        {
          message: `Limite de telas simultâneas atingido. Seu plano permite ${maxStreams} tela(s)`,
        },
      ],
    })
  }
}
