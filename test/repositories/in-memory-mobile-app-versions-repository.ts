import type { MobileAppVersionsRepository } from '@/modules/mobile-app/domain/repositories/mobile-app-versions-repository'
import type { MobileAppVersion } from '@/modules/mobile-app/domain/entities/mobile-app-version'

export class InMemoryMobileAppVersionsRepository implements MobileAppVersionsRepository {
  public items: MobileAppVersion[] = []

  async findById(id: string): Promise<MobileAppVersion | null> {
    return this.items.find((item) => item.id.toValue() === id) ?? null
  }

  async findByVersion(version: string): Promise<MobileAppVersion | null> {
    return this.items.find((item) => item.version === version) ?? null
  }

  async findCurrent(): Promise<MobileAppVersion | null> {
    return this.items.find((item) => item.isCurrent) ?? null
  }

  async findAll(): Promise<MobileAppVersion[]> {
    return [...this.items].sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
    )
  }

  async create(version: MobileAppVersion): Promise<void> {
    this.items.push(version)
  }

  async save(version: MobileAppVersion): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(version.id))
    if (index >= 0) {
      this.items[index] = version
    }
  }

  async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id.toValue() === id)
    if (index >= 0) this.items.splice(index, 1)
  }

  async setCurrent(id: string): Promise<void> {
    for (const item of this.items) {
      if (item.id.toValue() === id) {
        item.markAsCurrent()
      } else if (item.isCurrent) {
        item.unmarkAsCurrent()
      }
    }
  }
}
