import { Injectable } from '@nestjs/common'
import { Prisma } from '@/shared/database/generated/prisma'
import { PrismaService } from '@/shared/database/prisma.service'
import type {
  AdminUserDetail,
  AdminUserListItem,
  PaginatedUsers,
} from '../../application/ports/admin-user-gateway.port'
import { AdminUserGatewayPort } from '../../application/ports/admin-user-gateway.port'

@Injectable()
export class PrismaAdminUserGateway implements AdminUserGatewayPort {
  constructor(private prisma: PrismaService) {}

  async listUsers(
    page: number,
    perPage: number,
    search?: string,
  ): Promise<PaginatedUsers> {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}

    const [rows, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          subscriptions: {
            where: { status: 'active' },
            include: { plan: true },
            take: 1,
          },
          _count: { select: { profiles: true } },
        },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])

    const users: AdminUserListItem[] = rows.map((row) => {
      const activeSub = row.subscriptions[0]
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        subscription: activeSub
          ? {
              id: activeSub.id,
              status: activeSub.status,
              planName: activeSub.plan.name,
              planSlug: activeSub.plan.slug,
              endsAt: activeSub.endsAt,
            }
          : null,
        profilesCount: row._count.profiles,
        createdAt: row.createdAt,
      }
    })

    return {
      users,
      page,
      totalPages: Math.ceil(totalItems / perPage) || 1,
      totalItems,
    }
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          take: 1,
        },
        profiles: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!row) {
      return null
    }

    const activeSub = row.subscriptions[0]

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt,
      subscription: activeSub
        ? {
            id: activeSub.id,
            status: activeSub.status,
            startedAt: activeSub.startedAt,
            endsAt: activeSub.endsAt,
            plan: {
              id: activeSub.plan.id,
              name: activeSub.plan.name,
              slug: activeSub.plan.slug,
              maxProfiles: activeSub.plan.maxProfiles,
              maxStreams: activeSub.plan.maxStreams,
            },
          }
        : null,
      profiles: row.profiles.map((p) => ({
        id: p.id,
        name: p.name,
        isKid: p.isKid,
      })),
    }
  }
}
