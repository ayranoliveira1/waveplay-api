import { Profile } from '@/modules/profile/domain/entities/profile'
import { ProfilesRepository } from '@/modules/profile/domain/repositories/profiles-repository'
import { MaxProfilesReachedError } from '@/modules/profile/domain/errors/max-profiles-reached.error'

export class InMemoryProfilesRepository implements ProfilesRepository {
  public items: Profile[] = []

  async findById(id: string): Promise<Profile | null> {
    return this.items.find((item) => item.id.toValue() === id) ?? null
  }

  async findManyByUserId(userId: string): Promise<Profile[]> {
    return this.items.filter((item) => item.userId === userId)
  }

  async countByUserId(userId: string): Promise<number> {
    return this.items.filter((item) => item.userId === userId).length
  }

  async create(profile: Profile, maxProfiles: number): Promise<void> {
    const count = this.items.filter(
      (item) => item.userId === profile.userId,
    ).length

    if (count >= maxProfiles) {
      throw new MaxProfilesReachedError()
    }

    this.items.push(profile)
  }

  async save(profile: Profile): Promise<void> {
    const index = this.items.findIndex((item) =>
      item.id.toValue() === profile.id.toValue(),
    )

    if (index >= 0) {
      this.items[index] = profile
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id.toValue() !== id)
  }
}
