import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Profile } from '../../domain/entities/profile'
import type { Profile as PrismaProfile } from '@/shared/database/generated/prisma'

export class PrismaProfileMapper {
  static toDomain(raw: PrismaProfile): Profile {
    return Profile.create(
      {
        userId: raw.userId,
        name: raw.name,
        avatarUrl: raw.avatarUrl,
        isKid: raw.isKid,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(profile: Profile) {
    return {
      id: profile.id.toValue(),
      userId: profile.userId,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      isKid: profile.isKid,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    }
  }
}
