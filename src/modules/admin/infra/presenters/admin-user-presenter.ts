import type { User } from '@/modules/identity/domain/entities/user'
import type { Subscription } from '@/modules/subscription/domain/entities/subscription'
import type { Plan } from '@/modules/subscription/domain/entities/plan'
import type {
  AdminUserDetail,
  AdminUserListItem,
} from '../../application/ports/admin-user-gateway.port'

export class AdminUserPresenter {
  static toListHTTP(item: AdminUserListItem) {
    return {
      id: item.id,
      name: item.name,
      email: item.email,
      role: item.role,
      active: item.active,
      subscription: item.subscription,
      profilesCount: item.profilesCount,
      createdAt: item.createdAt,
    }
  }

  static toDetailHTTP(detail: AdminUserDetail) {
    return {
      id: detail.id,
      name: detail.name,
      email: detail.email,
      role: detail.role,
      active: detail.active,
      createdAt: detail.createdAt,
      subscription: detail.subscription,
      profiles: detail.profiles,
    }
  }

  static toCreatedHTTP(user: User, subscription: Subscription, plan: Plan) {
    return {
      id: user.id.toValue(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      subscription: {
        id: subscription.id.toValue(),
        status: subscription.status,
        endsAt: subscription.endsAt,
        plan: {
          id: plan.id.toValue(),
          name: plan.name,
          slug: plan.slug,
        },
      },
    }
  }

  static toUpdatedHTTP(user: User) {
    return {
      id: user.id.toValue(),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  static toSubscriptionHTTP(subscription: Subscription) {
    return {
      id: subscription.id.toValue(),
      status: subscription.status,
      planId: subscription.planId,
      startedAt: subscription.startedAt,
      endsAt: subscription.endsAt,
    }
  }
}
