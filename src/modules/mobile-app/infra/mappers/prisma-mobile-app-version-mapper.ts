import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import type { MobileAppVersion as PrismaMobileAppVersion } from '@/shared/database/generated/prisma'

export class PrismaMobileAppVersionMapper {
  static toDomain(raw: PrismaMobileAppVersion): MobileAppVersion {
    return MobileAppVersion.create(
      {
        version: raw.version,
        storageKey: raw.storageKey,
        downloadUrl: raw.downloadUrl,
        fileSize: raw.fileSize,
        releaseNotes: raw.releaseNotes,
        forceUpdate: raw.forceUpdate,
        isCurrent: raw.isCurrent,
        publishedAt: raw.publishedAt,
        publishedBy: raw.publishedBy,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(version: MobileAppVersion) {
    return {
      id: version.id.toValue(),
      version: version.version,
      storageKey: version.storageKey,
      downloadUrl: version.downloadUrl,
      fileSize: version.fileSize,
      releaseNotes: version.releaseNotes,
      forceUpdate: version.forceUpdate,
      isCurrent: version.isCurrent,
      publishedAt: version.publishedAt,
      publishedBy: version.publishedBy,
    }
  }
}
