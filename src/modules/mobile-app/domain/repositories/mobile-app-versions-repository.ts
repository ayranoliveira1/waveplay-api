import type { MobileAppVersion } from '../entities/mobile-app-version'

export abstract class MobileAppVersionsRepository {
  abstract findById(id: string): Promise<MobileAppVersion | null>
  abstract findByVersion(version: string): Promise<MobileAppVersion | null>
  abstract findCurrent(): Promise<MobileAppVersion | null>
  abstract findAll(): Promise<MobileAppVersion[]>
  abstract create(version: MobileAppVersion): Promise<void>
  abstract save(version: MobileAppVersion): Promise<void>
  abstract delete(id: string): Promise<void>
  abstract setCurrent(id: string): Promise<void>
}
