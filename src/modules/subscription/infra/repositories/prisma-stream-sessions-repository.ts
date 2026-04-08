import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import type { StreamSession } from '../../domain/entities/stream-session'
import { StreamSessionsRepository } from '../../domain/repositories/stream-sessions-repository'
import { PrismaStreamSessionMapper } from '../mappers/prisma-stream-session-mapper'

@Injectable()
export class PrismaStreamSessionsRepository implements StreamSessionsRepository {
  constructor(private prisma: PrismaService) {}

  async create(session: StreamSession): Promise<void> {
    const data = PrismaStreamSessionMapper.toPrisma(session)
    await this.prisma.streamSession.create({ data })
  }

  async createMany(sessions: StreamSession[]): Promise<void> {
    if (sessions.length === 0) return

    const data = sessions.map(PrismaStreamSessionMapper.toPrisma)
    await this.prisma.streamSession.createMany({ data })
  }
}
