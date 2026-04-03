import { UseCaseError } from '@/core/errors/use-case-error'
import type { ActiveStreamInfo } from '../../application/ports/stream-cache.port'

export class MaxStreamsReachedWithListError extends UseCaseError<never> {
  public readonly maxStreams: number
  public readonly activeStreams: ActiveStreamInfo[]

  constructor(maxStreams: number, activeStreams: ActiveStreamInfo[]) {
    super({
      statusCode: 409,
      errors: [
        {
          message: `Você atingiu o limite de ${maxStreams} tela(s) simultânea(s) do seu plano.`,
          code: 'MAX_STREAMS_REACHED',
        },
      ],
    })

    this.maxStreams = maxStreams
    this.activeStreams = activeStreams
  }
}
