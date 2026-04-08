import { describe, it, expect, beforeEach } from 'vitest'

import { GetDashboardAnalyticsUseCase } from './get-dashboard-analytics-use-case'
import { FakeAdminAnalyticsGateway } from 'test/ports/fake-admin-analytics-gateway'

let gateway: FakeAdminAnalyticsGateway
let sut: GetDashboardAnalyticsUseCase

describe('GetDashboardAnalyticsUseCase', () => {
  beforeEach(() => {
    gateway = new FakeAdminAnalyticsGateway()
    sut = new GetDashboardAnalyticsUseCase(gateway)
  })

  it('should return overview and period from gateway', async () => {
    gateway.overview = {
      totalUsers: 150,
      totalActiveSubscriptions: 148,
      subscriptionsByPlan: [
        { planName: 'Básico', planSlug: 'basico', count: 80 },
      ],
      activeStreams: 12,
      estimatedMonthlyRevenue: 296100,
      profileDistribution: [{ count: 1, users: 80 }],
      profilesByType: { kids: 30, normal: 120 },
    }

    gateway.period = {
      registrationsByDay: [{ date: '2026-01-01', count: 5 }],
      cumulativeUsers: [{ date: '2026-01-01', total: 100 }],
      activeUsers: 92,
      topContent: [
        { tmdbId: 123, title: 'Breaking Bad', type: 'series', views: 45 },
      ],
      streamsByHour: [{ hour: 20, count: 45 }],
      totalStreamSessions: 1250,
      avgStreamDuration: 2700,
    }

    const result = await sut.execute({})

    expect(result.isRight()).toBe(true)
    expect(result.value.overview.totalUsers).toBe(150)
    expect(result.value.overview.estimatedMonthlyRevenue).toBe(296100)
    expect(result.value.period.activeUsers).toBe(92)
    expect(result.value.period.topContent).toHaveLength(1)
  })

  it('should use default 30 days when dates are not provided', async () => {
    const result = await sut.execute({})

    expect(result.isRight()).toBe(true)
    expect(gateway.lastPeriodCall).not.toBeNull()

    const { startDate, endDate } = gateway.lastPeriodCall!
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    expect(diffDays).toBe(30)
  })

  it('should pass custom dates to gateway', async () => {
    const startDate = new Date('2026-01-01')
    const endDate = new Date('2026-01-31')

    await sut.execute({ startDate, endDate })

    expect(gateway.lastPeriodCall?.startDate).toEqual(startDate)
    expect(gateway.lastPeriodCall?.endDate).toEqual(endDate)
  })
})
