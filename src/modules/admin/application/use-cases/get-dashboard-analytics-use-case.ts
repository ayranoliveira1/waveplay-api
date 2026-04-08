import { Injectable } from '@nestjs/common'

import type { Either } from '@/core/either'
import { right } from '@/core/either'
import type {
  AnalyticsOverview,
  AnalyticsPeriod,
} from '../ports/admin-analytics-gateway.port'
import { AdminAnalyticsGatewayPort } from '../ports/admin-analytics-gateway.port'

interface GetDashboardAnalyticsRequest {
  startDate?: Date
  endDate?: Date
}

type GetDashboardAnalyticsResponse = Either<
  never,
  { overview: AnalyticsOverview; period: AnalyticsPeriod }
>

@Injectable()
export class GetDashboardAnalyticsUseCase {
  constructor(private gateway: AdminAnalyticsGatewayPort) {}

  async execute(
    request: GetDashboardAnalyticsRequest,
  ): Promise<GetDashboardAnalyticsResponse> {
    const endDate = request.endDate ?? new Date()
    const startDate =
      request.startDate ??
      new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [overview, period] = await Promise.all([
      this.gateway.getOverview(),
      this.gateway.getPeriod(startDate, endDate),
    ])

    return right({ overview, period })
  }
}
