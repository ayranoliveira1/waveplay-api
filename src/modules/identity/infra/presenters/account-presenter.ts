import type { User } from '../../domain/entities/user'
import type { AccountSubscriptionData } from '../../application/ports/account-gateway.port'

export class AccountPresenter {
  static toHTTP(user: User, subscription: AccountSubscriptionData | null) {
    return {
      id: user.id.toValue(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            startedAt: subscription.startedAt,
            endsAt: subscription.endsAt,
            plan: subscription.plan,
          }
        : null,
    }
  }
}
