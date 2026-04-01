import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { User } from '../../domain/entities/user'
import { User as PrismaUser } from '@/shared/database/generated/prisma'

export class PrismaUserMapper {
  static toDomain(raw: PrismaUser): User {
    return User.create(
      {
        name: raw.name,
        email: raw.email,
        passwordHash: raw.passwordHash,
        planId: raw.planId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(user: User) {
    return {
      id: user.id.toValue(),
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      planId: user.planId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
