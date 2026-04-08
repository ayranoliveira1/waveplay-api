import type {
  AnalyticsOverview,
  AnalyticsPeriod,
} from '@/modules/admin/application/ports/admin-analytics-gateway.port'
import type { AdminAnalyticsGatewayPort } from '@/modules/admin/application/ports/admin-analytics-gateway.port'

export class FakeAdminAnalyticsGateway implements AdminAnalyticsGatewayPort {
  public overview: AnalyticsOverview = {
    totalUsers: 0,
    totalActiveSubscriptions: 0,
    subscriptionsByPlan: [],
    activeStreams: 0,
    estimatedMonthlyRevenue: 0,
    profileDistribution: [],
    profilesByType: { kids: 0, normal: 0 },
  }

  public period: AnalyticsPeriod = {
    registrationsByDay: [],
    cumulativeUsers: [],
    activeUsers: 0,
    topContent: [],
    streamsByHour: [],
    totalStreamSessions: 0,
    avgStreamDuration: 0,
  }

  public lastPeriodCall: { startDate: Date; endDate: Date } | null = null

  async getOverview(): Promise<AnalyticsOverview> {
    return this.overview
  }

  async getPeriod(startDate: Date, endDate: Date): Promise<AnalyticsPeriod> {
    this.lastPeriodCall = { startDate, endDate }
    return this.period
  }
}
