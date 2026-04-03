import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import { ActiveStream } from '../../domain/entities/active-stream'
import { ActiveStreamsRepository } from '../../domain/repositories/active-streams-repository'
import { MaxStreamsReachedError } from '../../domain/errors/max-streams-reached.error'
import { PrismaActiveStreamMapper } from '../mappers/prisma-active-stream-mapper'

const STREAM_TIMEOUT_MS = 2 * 60 * 1000

@Injectable()
export class PrismaActiveStreamsRepository implements ActiveStreamsRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<ActiveStream | null> {
    const stream = await this.prisma.activeStream.findUnique({
      where: { id },
    })

    if (!stream) {
      return null
    }

    return PrismaActiveStreamMapper.toDomain(stream)
  }

  async findByUserAndProfile(
    userId: string,
    profileId: string,
  ): Promise<ActiveStream | null> {
    const stream = await this.prisma.activeStream.findUnique({
      where: { userId_profileId: { userId, profileId } },
    })

    if (!stream) {
      return null
    }

    return PrismaActiveStreamMapper.toDomain(stream)
  }

  async countActiveByUserId(userId: string, threshold: Date): Promise<number> {
    return this.prisma.activeStream.count({
      where: { userId, lastPing: { gte: threshold } },
    })
  }

  async createOrUpdate(
    stream: ActiveStream,
    maxStreams: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const threshold = new Date(Date.now() - STREAM_TIMEOUT_MS)

      const count = await tx.activeStream.count({
        where: {
          userId: stream.userId,
          lastPing: { gte: threshold },
          NOT: {
            userId: stream.userId,
            profileId: stream.profileId,
          },
        },
      })

      if (count >= maxStreams) {
        throw new MaxStreamsReachedError(maxStreams)
      }

      await tx.activeStream.upsert({
        where: {
          userId_profileId: {
            userId: stream.userId,
            profileId: stream.profileId,
          },
        },
        create: PrismaActiveStreamMapper.toPrisma(stream),
        update: {
          tmdbId: stream.tmdbId,
          type: stream.type,
          startedAt: stream.startedAt,
          lastPing: stream.lastPing,
        },
      })
    })
  }

  async updatePing(id: string, lastPing: Date): Promise<void> {
    await this.prisma.activeStream.update({
      where: { id },
      data: { lastPing },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.activeStream.delete({
      where: { id },
    })
  }

  async deleteExpired(threshold: Date): Promise<number> {
    const result = await this.prisma.activeStream.deleteMany({
      where: { lastPing: { lt: threshold } },
    })

    return result.count
  }
}
