import type { Profile } from '../../domain/entities/profile'

export class ProfilePresenter {
  static toHTTP(profile: Profile) {
    return {
      id: profile.id.toValue(),
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      isKid: profile.isKid,
      createdAt: profile.createdAt,
    }
  }
}
