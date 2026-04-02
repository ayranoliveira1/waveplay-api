import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { Profile } from '../../domain/entities/profile'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { MaxProfilesReachedError } from '../../domain/errors/max-profiles-reached.error'
import { PrismaProfileMapper } from '../mappers/prisma-profile-mapper'

@Injectable()
export class PrismaProfilesRepository implements ProfilesRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Profile | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
    })

    if (!profile) {
      return null
    }

    return PrismaProfileMapper.toDomain(profile)
  }

  async findManyByUserId(userId: string): Promise<Profile[]> {
    const profiles = await this.prisma.profile.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })

    return profiles.map(PrismaProfileMapper.toDomain)
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.profile.count({
      where: { userId },
    })
  }

  async create(profile: Profile, maxProfiles: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const count = await tx.profile.count({
        where: { userId: profile.userId },
      })

      if (count >= maxProfiles) {
        throw new MaxProfilesReachedError()
      }

      await tx.profile.create({
        data: PrismaProfileMapper.toPrisma(profile),
      })
    })
  }

  async save(profile: Profile): Promise<void> {
    await this.prisma.profile.update({
      where: { id: profile.id.toValue() },
      data: PrismaProfileMapper.toPrisma(profile),
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.profile.delete({
      where: { id },
    })
  }
}
