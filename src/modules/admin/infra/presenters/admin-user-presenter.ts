import type { User } from '@/modules/identity/domain/entities/user'
import type { Subscription } from '@/modules/subscription/domain/entities/subscription'
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
      createdAt: detail.createdAt,
      subscription: detail.subscription,
      profiles: detail.profiles,
    }
  }

  static toCreatedHTTP(user: User) {
    return {
      id: user.id.toValue(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
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
