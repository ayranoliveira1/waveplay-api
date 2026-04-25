import { AggregateRoot } from '@/core/entities/aggregate-root'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'
import type { Optional } from '@/core/types/optional'

export interface MobileAppVersionProps {
  version: string
  storageKey: string
  downloadUrl: string
  fileSize: number
  releaseNotes: string | null
  forceUpdate: boolean
  isCurrent: boolean
  publishedBy: string
  publishedAt: Date
  updatedAt: Date
}

export class MobileAppVersion extends AggregateRoot<MobileAppVersionProps> {
  get version() {
    return this.props.version
  }

  get storageKey() {
    return this.props.storageKey
  }

  get downloadUrl() {
    return this.props.downloadUrl
  }

  get fileSize() {
    return this.props.fileSize
  }

  get releaseNotes() {
    return this.props.releaseNotes
  }

  set releaseNotes(value: string | null) {
    this.props.releaseNotes = value
  }

  get forceUpdate() {
    return this.props.forceUpdate
  }

  set forceUpdate(value: boolean) {
    this.props.forceUpdate = value
  }

  get isCurrent() {
    return this.props.isCurrent
  }

  get publishedAt() {
    return this.props.publishedAt
  }

  get publishedBy() {
    return this.props.publishedBy
  }

  markAsCurrent() {
    this.props.isCurrent = true
  }

  unmarkAsCurrent() {
    this.props.isCurrent = false
  }

  static create(
    props: Optional<
      MobileAppVersionProps,
      'releaseNotes' | 'forceUpdate' | 'isCurrent' | 'publishedAt' | 'updatedAt'
    >,
    id?: UniqueEntityID,
  ) {
    return new MobileAppVersion(
      {
        ...props,
        releaseNotes: props.releaseNotes ?? null,
        forceUpdate: props.forceUpdate ?? false,
        isCurrent: props.isCurrent ?? false,
        publishedAt: props.publishedAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    )
  }
}
