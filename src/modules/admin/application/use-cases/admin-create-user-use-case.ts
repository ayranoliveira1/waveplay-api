import { Injectable, Logger } from '@nestjs/common'

import type { Either } from '@/core/either'
import { left, right } from '@/core/either'
import { User } from '@/modules/identity/domain/entities/user'
import { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import { HasherPort } from '@/modules/identity/application/ports/hasher.port'
import { EmailAlreadyExistsError } from '@/modules/identity/domain/errors/email-already-exists.error'
import { WeakPasswordError } from '@/modules/identity/domain/errors/weak-password.error'
import { Subscription } from '@/modules/subscription/domain/entities/subscription'
import { SubscriptionsRepository } from '@/modules/subscription/domain/repositories/subscriptions-repository'
import { PlansRepository } from '@/modules/subscription/domain/repositories/plans-repository'
import { Plan } from '@/modules/subscription/domain/entities/plan'
import { Profile } from '@/modules/profile/domain/entities/profile'
import { ProfilesRepository } from '@/modules/profile/domain/repositories/profiles-repository'
import { PlanNotFoundError } from '../../domain/errors/plan-not-found.error'
import { InvalidSubscriptionEndDateError } from '../../domain/errors/invalid-subscription-end-date.error'

interface AdminCreateUserRequest {
  name: string
  email: string
  password: string
  planId: string
  endsAt?: Date | null
}

type AdminCreateUserResponse = Either<
  | EmailAlreadyExistsError
  | WeakPasswordError
  | PlanNotFoundError
  | InvalidSubscriptionEndDateError,
  { user: User; subscription: Subscription; plan: Plan }
>

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/

@Injectable()
export class AdminCreateUserUseCase {
  private readonly logger = new Logger(AdminCreateUserUseCase.name)

  constructor(
    private usersRepository: UsersRepository,
    private hasher: HasherPort,
    private plansRepository: PlansRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private profilesRepository: ProfilesRepository,
  ) {}

  async execute({
    name,
    email,
    password,
    planId,
    endsAt,
  }: AdminCreateUserRequest): Promise<AdminCreateUserResponse> {
    if (!PASSWORD_REGEX.test(password)) {
      return left(new WeakPasswordError())
    }

    const existingUser = await this.usersRepository.findByEmail(email)
    if (existingUser) {
      return left(new EmailAlreadyExistsError())
    }

    const plan = await this.plansRepository.findById(planId)
    if (!plan) {
      return left(new PlanNotFoundError())
    }

    if (endsAt && endsAt.getTime() <= Date.now()) {
      return left(new InvalidSubscriptionEndDateError())
    }

    const passwordHash = await this.hasher.hash(password)

    const user = User.create({
      name,
      email,
      passwordHash,
    })
    await this.usersRepository.create(user)

    const subscription = Subscription.create({
      userId: user.id.toValue(),
      planId: plan.id.toValue(),
      endsAt: endsAt ?? null,
    })
    await this.subscriptionsRepository.create(subscription)

    const profile = Profile.create({
      userId: user.id.toValue(),
      name: user.name,
    })
    await this.profilesRepository.create(profile, plan.maxProfiles)

    this.logger.log(`Admin created user: ${user.id.toValue()}`)

    return right({ user, subscription, plan })
  }
}
