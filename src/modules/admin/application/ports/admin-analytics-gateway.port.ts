export interface AnalyticsOverview {
  totalUsers: number
  totalActiveSubscriptions: number
  subscriptionsByPlan: { planName: string; planSlug: string; count: number }[]
  activeStreams: number
  estimatedMonthlyRevenue: number
  profileDistribution: { count: number; users: number }[]
  profilesByType: { kids: number; normal: number }
}

export interface AnalyticsPeriod {
  registrationsByDay: { date: string; count: number }[]
  cumulativeUsers: { date: string; total: number }[]
  activeUsers: number
  topContent: {
    tmdbId: number
    title: string
    type: string
    views: number
  }[]
  streamsByHour: { hour: number; count: number }[]
  totalStreamSessions: number
  avgStreamDuration: number
}

export abstract class AdminAnalyticsGatewayPort {
  abstract getOverview(): Promise<AnalyticsOverview>
  abstract getPeriod(startDate: Date, endDate: Date): Promise<AnalyticsPeriod>
}
