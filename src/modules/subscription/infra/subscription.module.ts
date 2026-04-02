import { Module } from '@nestjs/common'

// Repositories (abstract → impl)
import { SubscriptionsRepository } from '../domain/repositories/subscriptions-repository'
import { PlansRepository } from '../domain/repositories/plans-repository'
import { PrismaSubscriptionsRepository } from './repositories/prisma-subscriptions-repository'
import { PrismaPlansRepository } from './repositories/prisma-plans-repository'

// Subscribers
import { OnUserRegisteredSubscription } from '../application/subscribers/on-user-registered'

@Module({
  providers: [
    // Repositories
    {
      provide: SubscriptionsRepository,
      useClass: PrismaSubscriptionsRepository,
    },
    { provide: PlansRepository, useClass: PrismaPlansRepository },

    // Subscribers
    OnUserRegisteredSubscription,
  ],
  exports: [SubscriptionsRepository, PlansRepository],
})
export class SubscriptionModule {}
