import type { MobileAppVersion } from '../../domain/entities/mobile-app-version'

export class MobileAppVersionPresenter {
  static toAdminHTTP(v: MobileAppVersion) {
    return {
      id: v.id.toValue(),
      version: v.version,
      downloadUrl: v.downloadUrl,
      fileSize: v.fileSize,
      releaseNotes: v.releaseNotes,
      forceUpdate: v.forceUpdate,
      isCurrent: v.isCurrent,
      publishedAt: v.publishedAt,
      publishedBy: v.publishedBy,
    }
  }

  static toPublicHTTP(v: MobileAppVersion) {
    return {
      version: v.version,
      downloadUrl: v.downloadUrl,
      forceUpdate: v.forceUpdate,
      releaseNotes: v.releaseNotes,
    }
  }
}
