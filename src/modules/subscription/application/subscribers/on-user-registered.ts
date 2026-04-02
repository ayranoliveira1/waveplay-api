import { Injectable, Logger, OnModuleInit } from '@nestjs/common'

import { DomainEvents } from '@/core/events/domain-events'
import { EventHandler } from '@/core/events/event-handler'
import { UserRegisteredEvent } from '@/modules/identity/domain/events/user-registered-event'
import { SubscriptionsRepository } from '../../domain/repositories/subscriptions-repository'
import { PlansRepository } from '../../domain/repositories/plans-repository'
import { Subscription } from '../../domain/entities/subscription'

@Injectable()
export class OnUserRegisteredSubscription
  implements EventHandler, OnModuleInit
{
  private readonly logger = new Logger(OnUserRegisteredSubscription.name)

  constructor(
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
  ) {}

  onModuleInit() {
    this.setupSubscriptions()
  }

  setupSubscriptions(): void {
    DomainEvents.register(
      (event: UserRegisteredEvent) => this.handleEvent(event),
      UserRegisteredEvent.name,
    )
  }

  private async handleEvent(event: UserRegisteredEvent): Promise<void> {
    const { user } = event
    const userId = user.id.toValue()

    const plan = await this.plansRepository.findBySlug('basico')

    if (!plan) {
      this.logger.warn(
        'Default plan "basico" not found — subscription not created',
      )
      return
    }

    const subscription = Subscription.create({
      userId,
      planId: plan.id.toValue(),
    })

    await this.subscriptionsRepository.create(subscription)

    this.logger.log(
      `Subscription created for user ${userId} with plan "${plan.slug}"`,
    )
  }
}
