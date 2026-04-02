import type { Profile } from '../entities/profile'

export abstract class ProfilesRepository {
  abstract findById(id: string): Promise<Profile | null>
  abstract findManyByUserId(userId: string): Promise<Profile[]>
  abstract countByUserId(userId: string): Promise<number>
  abstract create(profile: Profile, maxProfiles: number): Promise<void>
  abstract save(profile: Profile): Promise<void>
  abstract delete(id: string): Promise<void>
}
