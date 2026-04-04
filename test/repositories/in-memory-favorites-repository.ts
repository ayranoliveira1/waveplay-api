import type { Favorite } from '@/modules/library/domain/entities/favorite'
import type { FavoritesRepository } from '@/modules/library/domain/repositories/favorites-repository'

export class InMemoryFavoritesRepository implements FavoritesRepository {
  public items: Favorite[] = []

  async findByProfileId(
    profileId: string,
    page: number,
    perPage: number,
  ): Promise<Favorite[]> {
    const filtered = this.items
      .filter((item) => item.profileId === profileId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return filtered.slice((page - 1) * perPage, page * perPage)
  }

  async countByProfileId(profileId: string): Promise<number> {
    return this.items.filter((item) => item.profileId === profileId).length
  }

  async findByProfileAndTmdb(
    profileId: string,
    tmdbId: number,
    type: string,
  ): Promise<Favorite | null> {
    return (
      this.items.find(
        (item) =>
          item.profileId === profileId &&
          item.tmdbId === tmdbId &&
          item.type === type,
      ) ?? null
    )
  }

  async toggle(favorite: Favorite): Promise<boolean> {
    const index = this.items.findIndex(
      (item) =>
        item.profileId === favorite.profileId &&
        item.tmdbId === favorite.tmdbId &&
        item.type === favorite.type,
    )

    if (index >= 0) {
      this.items.splice(index, 1)
      return false
    }

    this.items.push(favorite)
    return true
  }

  async create(favorite: Favorite): Promise<void> {
    this.items.push(favorite)
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id.toValue() !== id)
  }
}
