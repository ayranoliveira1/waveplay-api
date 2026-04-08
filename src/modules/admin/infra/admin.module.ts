import { Module } from '@nestjs/common'

import { SubscriptionModule } from '@/modules/subscription/infra/subscription.module'

// Use cases
import { GetDashboardAnalyticsUseCase } from '../application/use-cases/get-dashboard-analytics-use-case'

// Controllers
import { DashboardAnalyticsController } from './controllers/dashboard-analytics.controller'

// Ports (cross-BC gateway)
import { AdminAnalyticsGatewayPort } from '../application/ports/admin-analytics-gateway.port'
import { PrismaAdminAnalyticsGateway } from './gateways/prisma-admin-analytics-gateway'

@Module({
  imports: [SubscriptionModule],
  controllers: [DashboardAnalyticsController],
  providers: [
    GetDashboardAnalyticsUseCase,
    {
      provide: AdminAnalyticsGatewayPort,
      useClass: PrismaAdminAnalyticsGateway,
    },
  ],
})
export class AdminModule {}
