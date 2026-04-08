import { Module } from '@nestjs/common'

// Use cases
import { ListPlansUseCase } from '../application/use-cases/list-plans-use-case'
import { StartStreamUseCase } from '../application/use-cases/start-stream-use-case'
import { PingStreamUseCase } from '../application/use-cases/ping-stream-use-case'
import { StopStreamUseCase } from '../application/use-cases/stop-stream-use-case'
import { CleanupExpiredStreamsUseCase } from '../application/use-cases/cleanup-expired-streams-use-case'

// Controllers
import { ListPlansController } from './controllers/list-plans.controller'
import { StartStreamController } from './controllers/start-stream.controller'
import { PingStreamController } from './controllers/ping-stream.controller'
import { StopStreamController } from './controllers/stop-stream.controller'

// Repositories (abstract → impl)
import { SubscriptionsRepository } from '../domain/repositories/subscriptions-repository'
import { PlansRepository } from '../domain/repositories/plans-repository'
import { ActiveStreamsRepository } from '../domain/repositories/active-streams-repository'
import { PrismaSubscriptionsRepository } from './repositories/prisma-subscriptions-repository'
import { PrismaPlansRepository } from './repositories/prisma-plans-repository'
import { PrismaActiveStreamsRepository } from './repositories/prisma-active-streams-repository'

// Ports (cross-BC gateway)
import { ProfileOwnershipGatewayPort } from '../application/ports/profile-ownership-gateway.port'
import { PrismaProfileOwnershipGateway } from './gateways/prisma-profile-ownership-gateway'

// Ports (stream cache)
import { StreamCachePort } from '../application/ports/stream-cache.port'
import { RedisStreamCache } from './cache/redis-stream-cache'

@Module({
  controllers: [
    ListPlansController,
    StartStreamController,
    PingStreamController,
    StopStreamController,
  ],
  providers: [
    // Use cases
    ListPlansUseCase,
    StartStreamUseCase,
    PingStreamUseCase,
    StopStreamUseCase,
    CleanupExpiredStreamsUseCase,

    // Repositories
    {
      provide: SubscriptionsRepository,
      useClass: PrismaSubscriptionsRepository,
    },
    { provide: PlansRepository, useClass: PrismaPlansRepository },
    {
      provide: ActiveStreamsRepository,
      useClass: PrismaActiveStreamsRepository,
    },

    // Ports
    {
      provide: ProfileOwnershipGatewayPort,
      useClass: PrismaProfileOwnershipGateway,
    },
    { provide: StreamCachePort, useClass: RedisStreamCache },
  ],
  exports: [SubscriptionsRepository, PlansRepository],
})
export class SubscriptionModule {}
