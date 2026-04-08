import { Injectable } from '@nestjs/common'
import { Prisma } from '@/shared/database/generated/prisma'
import { PrismaService } from '@/shared/database/prisma.service'
import type {
  AnalyticsOverview,
  AnalyticsPeriod,
} from '../../application/ports/admin-analytics-gateway.port'
import { AdminAnalyticsGatewayPort } from '../../application/ports/admin-analytics-gateway.port'

@Injectable()
export class PrismaAdminAnalyticsGateway implements AdminAnalyticsGatewayPort {
  constructor(private prisma: PrismaService) {}

  async getOverview(): Promise<AnalyticsOverview> {
    const [
      totalUsers,
      totalActiveSubscriptions,
      subscriptionsByPlanRaw,
      activeStreams,
      revenueRaw,
      profileDistRaw,
      kidsCount,
      normalCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.$queryRaw<
        { plan_name: string; plan_slug: string; count: bigint }[]
      >(
        Prisma.sql`SELECT p.name AS plan_name, p.slug AS plan_slug, COUNT(*)::bigint AS count
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.status = 'active'
         GROUP BY p.name, p.slug
         ORDER BY count DESC`,
      ),
      this.prisma.activeStream.count(),
      this.prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COALESCE(SUM(p.price_cents), 0)::bigint AS total
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.status = 'active'`,
      ),
      this.prisma.$queryRaw<{ count: bigint; users: bigint }[]>(
        Prisma.sql`SELECT profile_count::bigint AS count, COUNT(*)::bigint AS users
         FROM (
           SELECT user_id, COUNT(*)::int AS profile_count
           FROM profiles
           GROUP BY user_id
         ) sub
         GROUP BY profile_count
         ORDER BY profile_count`,
      ),
      this.prisma.profile.count({ where: { isKid: true } }),
      this.prisma.profile.count({ where: { isKid: false } }),
    ])

    return {
      totalUsers,
      totalActiveSubscriptions,
      subscriptionsByPlan: subscriptionsByPlanRaw.map((row) => ({
        planName: row.plan_name,
        planSlug: row.plan_slug,
        count: Number(row.count),
      })),
      activeStreams,
      estimatedMonthlyRevenue: Number(revenueRaw[0]?.total ?? 0),
      profileDistribution: profileDistRaw.map((row) => ({
        count: Number(row.count),
        users: Number(row.users),
      })),
      profilesByType: { kids: kidsCount, normal: normalCount },
    }
  }

  async getPeriod(startDate: Date, endDate: Date): Promise<AnalyticsPeriod> {
    const [
      registrationsByDayRaw,
      cumulativeUsersRaw,
      activeUsersRaw,
      topContentRaw,
      streamsByHourRaw,
      totalStreamSessions,
      avgStreamDurationRaw,
    ] = await Promise.all([
      this.prisma.$queryRaw<{ date: Date; count: bigint }[]>(
        Prisma.sql`SELECT DATE("createdAt") AS date, COUNT(*)::bigint AS count
         FROM users
         WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
         GROUP BY DATE("createdAt")
         ORDER BY date`,
      ),
      this.prisma.$queryRaw<{ date: Date; total: bigint }[]>(
        Prisma.sql`SELECT d.date, COUNT(u.id)::bigint AS total
         FROM generate_series(${startDate}::date, ${endDate}::date, '1 day'::interval) AS d(date)
         LEFT JOIN users u ON DATE(u."createdAt") <= d.date
         GROUP BY d.date
         ORDER BY d.date`,
      ),
      this.prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(DISTINCT p.user_id)::bigint AS count
         FROM history_items h
         JOIN profiles p ON h.profile_id = p.id
         WHERE h.watched_at >= ${startDate} AND h.watched_at <= ${endDate}`,
      ),
      this.prisma.$queryRaw<
        { tmdb_id: number; title: string; type: string; views: bigint }[]
      >(
        Prisma.sql`SELECT tmdb_id, title, type, COUNT(*)::bigint AS views
         FROM history_items
         WHERE watched_at >= ${startDate} AND watched_at <= ${endDate}
         GROUP BY tmdb_id, title, type
         ORDER BY views DESC
         LIMIT 10`,
      ),
      this.prisma.$queryRaw<{ hour: number; count: bigint }[]>(
        Prisma.sql`SELECT EXTRACT(HOUR FROM started_at)::int AS hour, COUNT(*)::bigint AS count
         FROM stream_sessions
         WHERE ended_at >= ${startDate} AND ended_at <= ${endDate}
         GROUP BY hour
         ORDER BY hour`,
      ),
      this.prisma.streamSession.count({
        where: { endedAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.streamSession.aggregate({
        _avg: { durationSeconds: true },
        where: { endedAt: { gte: startDate, lte: endDate } },
      }),
    ])

    return {
      registrationsByDay: registrationsByDayRaw.map((row) => ({
        date: formatDate(row.date),
        count: Number(row.count),
      })),
      cumulativeUsers: cumulativeUsersRaw.map((row) => ({
        date: formatDate(row.date),
        total: Number(row.total),
      })),
      activeUsers: Number(activeUsersRaw[0]?.count ?? 0),
      topContent: topContentRaw.map((row) => ({
        tmdbId: row.tmdb_id,
        title: row.title,
        type: row.type,
        views: Number(row.views),
      })),
      streamsByHour: streamsByHourRaw.map((row) => ({
        hour: row.hour,
        count: Number(row.count),
      })),
      totalStreamSessions,
      avgStreamDuration: Math.round(
        avgStreamDurationRaw._avg.durationSeconds ?? 0,
      ),
    }
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
