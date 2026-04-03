import { UseCaseError } from '@/core/errors/use-case-error'

export class MaxStreamsReachedError extends UseCaseError<never> {
  constructor(maxStreams: number) {
    super({
      statusCode: 403,
      errors: [
        {
          message: `Você atingiu o limite de ${maxStreams} tela(s) simultânea(s) do seu plano. Pare uma reprodução em outro dispositivo ou faça upgrade.`,
        },
      ],
    })
  }
}
