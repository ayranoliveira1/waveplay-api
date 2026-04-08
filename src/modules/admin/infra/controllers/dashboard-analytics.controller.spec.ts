import { describe, it, expect, beforeEach } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'

import { DashboardAnalyticsController } from './dashboard-analytics.controller'
import { GetDashboardAnalyticsUseCase } from '../../application/use-cases/get-dashboard-analytics-use-case'
import { AdminAnalyticsGatewayPort } from '../../application/ports/admin-analytics-gateway.port'
import { FakeAdminAnalyticsGateway } from 'test/ports/fake-admin-analytics-gateway'
import { FakeAuthGuard } from 'test/guards/fake-auth.guard'
import { AllExceptionsFilter } from '@/shared/filters/nest-exception-filter'
import { UserRole } from '@/modules/identity/domain/entities/user'

let app: INestApplication

describe('DashboardAnalyticsController', () => {
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 300 }],
        }),
      ],
      controllers: [DashboardAnalyticsController],
      providers: [
        GetDashboardAnalyticsUseCase,
        {
          provide: AdminAnalyticsGatewayPort,
          useClass: FakeAdminAnalyticsGateway,
        },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
  })

  it('should return 200 with overview and period for admin', async () => {
    FakeAuthGuard.userId = 'admin-1'
    // Simulate admin role in request
    const originalCanActivate = FakeAuthGuard.prototype.canActivate
    FakeAuthGuard.prototype.canActivate = function (context) {
      const req = context.switchToHttp().getRequest()
      req.user = { userId: 'admin-1', role: UserRole.ADMIN }
      return true
    }

    const response = await request(app.getHttpServer()).get('/admin/analytics')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.overview).toBeDefined()
    expect(response.body.data.period).toBeDefined()
    expect(response.body.data.overview.totalUsers).toBeDefined()
    expect(response.body.data.period.registrationsByDay).toBeDefined()

    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should return 403 for non-admin user', async () => {
    const originalCanActivate = FakeAuthGuard.prototype.canActivate
    FakeAuthGuard.prototype.canActivate = function (context) {
      const req = context.switchToHttp().getRequest()
      req.user = { userId: 'user-1', role: UserRole.USER }
      return true
    }

    const response = await request(app.getHttpServer()).get('/admin/analytics')

    expect(response.status).toBe(403)

    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })

  it('should accept startDate and endDate query params', async () => {
    const originalCanActivate = FakeAuthGuard.prototype.canActivate
    FakeAuthGuard.prototype.canActivate = function (context) {
      const req = context.switchToHttp().getRequest()
      req.user = { userId: 'admin-1', role: UserRole.ADMIN }
      return true
    }

    const response = await request(app.getHttpServer())
      .get('/admin/analytics')
      .query({ startDate: '2026-01-01', endDate: '2026-01-31' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    FakeAuthGuard.prototype.canActivate = originalCanActivate
  })
})
