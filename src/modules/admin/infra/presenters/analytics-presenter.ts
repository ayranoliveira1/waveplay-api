import type {
  AnalyticsOverview,
  AnalyticsPeriod,
} from '../../application/ports/admin-analytics-gateway.port'

export class AnalyticsPresenter {
  static toHTTP(overview: AnalyticsOverview, period: AnalyticsPeriod) {
    return {
      overview,
      period,
    }
  }
}
