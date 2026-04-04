import type { Favorite } from '../entities/favorite'

export abstract class FavoritesRepository {
  abstract findByProfileId(
    profileId: string,
    page: number,
    perPage: number,
  ): Promise<Favorite[]>
  abstract countByProfileId(profileId: string): Promise<number>
  abstract findByProfileAndTmdb(
    profileId: string,
    tmdbId: number,
    type: string,
  ): Promise<Favorite | null>
  abstract create(favorite: Favorite): Promise<void>
  abstract delete(id: string): Promise<void>
}
