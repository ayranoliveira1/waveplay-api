import { Module } from '@nestjs/common'

import { SubscriptionModule } from '@/modules/subscription/infra/subscription.module'
import { IdentityModule } from '@/modules/identity/infra/identity.module'
import { ProfileModule } from '@/modules/profile/infra/profile.module'

// Use cases
import { GetDashboardAnalyticsUseCase } from '../application/use-cases/get-dashboard-analytics-use-case'
import { ListUsersUseCase } from '../application/use-cases/list-users-use-case'
import { GetUserDetailUseCase } from '../application/use-cases/get-user-detail-use-case'
import { AdminCreateUserUseCase } from '../application/use-cases/admin-create-user-use-case'
import { AdminUpdateUserUseCase } from '../application/use-cases/admin-update-user-use-case'
import { DeactivateUserUseCase } from '../application/use-cases/deactivate-user-use-case'
import { DeleteUserUseCase } from '../application/use-cases/delete-user-use-case'
import { UpdateUserSubscriptionUseCase } from '../application/use-cases/update-user-subscription-use-case'
import { CancelUserSubscriptionUseCase } from '../application/use-cases/cancel-user-subscription-use-case'
import { CreatePlanUseCase } from '../application/use-cases/create-plan-use-case'
import { UpdatePlanUseCase } from '../application/use-cases/update-plan-use-case'
import { TogglePlanActiveUseCase } from '../application/use-cases/toggle-plan-active-use-case'
import { ListAdminPlansUseCase } from '../application/use-cases/list-admin-plans-use-case'
import { DeletePlanUseCase } from '../application/use-cases/delete-plan-use-case'

// Controllers
import { DashboardAnalyticsController } from './controllers/dashboard-analytics.controller'
import { ListUsersController } from './controllers/list-users.controller'
import { GetUserDetailController } from './controllers/get-user-detail.controller'
import { AdminCreateUserController } from './controllers/admin-create-user.controller'
import { AdminUpdateUserController } from './controllers/admin-update-user.controller'
import { DeactivateUserController } from './controllers/deactivate-user.controller'
import { DeleteUserController } from './controllers/delete-user.controller'
import { UpdateUserSubscriptionController } from './controllers/update-user-subscription.controller'
import { CancelUserSubscriptionController } from './controllers/cancel-user-subscription.controller'
import { CreatePlanController } from './controllers/create-plan.controller'
import { UpdatePlanController } from './controllers/update-plan.controller'
import { TogglePlanActiveController } from './controllers/toggle-plan-active.controller'
import { ListAdminPlansController } from './controllers/list-admin-plans.controller'
import { DeletePlanController } from './controllers/delete-plan.controller'

// Ports (cross-BC gateway)
import { AdminAnalyticsGatewayPort } from '../application/ports/admin-analytics-gateway.port'
import { PrismaAdminAnalyticsGateway } from './gateways/prisma-admin-analytics-gateway'
import { AdminUserGatewayPort } from '../application/ports/admin-user-gateway.port'
import { PrismaAdminUserGateway } from './gateways/prisma-admin-user-gateway'

@Module({
  imports: [SubscriptionModule, IdentityModule, ProfileModule],
  controllers: [
    DashboardAnalyticsController,
    ListUsersController,
    GetUserDetailController,
    AdminCreateUserController,
    AdminUpdateUserController,
    DeactivateUserController,
    DeleteUserController,
    UpdateUserSubscriptionController,
    CancelUserSubscriptionController,
    CreatePlanController,
    UpdatePlanController,
    TogglePlanActiveController,
    ListAdminPlansController,
    DeletePlanController,
  ],
  providers: [
    GetDashboardAnalyticsUseCase,
    ListUsersUseCase,
    GetUserDetailUseCase,
    AdminCreateUserUseCase,
    AdminUpdateUserUseCase,
    DeactivateUserUseCase,
    DeleteUserUseCase,
    UpdateUserSubscriptionUseCase,
    CancelUserSubscriptionUseCase,
    CreatePlanUseCase,
    UpdatePlanUseCase,
    TogglePlanActiveUseCase,
    ListAdminPlansUseCase,
    DeletePlanUseCase,
    {
      provide: AdminAnalyticsGatewayPort,
      useClass: PrismaAdminAnalyticsGateway,
    },
    {
      provide: AdminUserGatewayPort,
      useClass: PrismaAdminUserGateway,
    },
  ],
})
export class AdminModule {}
