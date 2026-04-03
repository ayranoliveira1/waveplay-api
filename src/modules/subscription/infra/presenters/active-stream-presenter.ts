import type { ActiveStreamInfo } from '../../application/ports/stream-cache.port'

export class ActiveStreamPresenter {
  static toHTTP(streams: ActiveStreamInfo[]) {
    return streams.map((stream) => ({
      streamId: stream.streamId,
      profileName: stream.profileName,
      title: stream.title,
      type: stream.type,
      startedAt: stream.startedAt,
    }))
  }
}
