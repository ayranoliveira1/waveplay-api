import { Injectable, OnModuleInit } from '@nestjs/common'

import { DomainEvents } from '@/core/events/domain-events'
import { EventHandler } from '@/core/events/event-handler'
import { UserRegisteredEvent } from '@/modules/identity/domain/events/user-registered-event'
import { ProfilesRepository } from '../../domain/repositories/profiles-repository'
import { UserPlanGatewayPort } from '../ports/user-plan-gateway.port'
import { Profile } from '../../domain/entities/profile'

@Injectable()
export class OnUserRegistered implements EventHandler, OnModuleInit {
  constructor(
    private profilesRepository: ProfilesRepository,
    private userPlanGateway: UserPlanGatewayPort,
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

    const maxProfiles = await this.userPlanGateway.getMaxProfiles(userId)

    const profile = Profile.create({
      userId,
      name: user.name,
    })

    await this.profilesRepository.create(profile, maxProfiles)
  }
}
