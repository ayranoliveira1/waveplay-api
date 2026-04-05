import type {
  AccountGatewayPort,
  AccountSubscriptionData,
} from '@/modules/identity/application/ports/account-gateway.port'

export class FakeAccountGateway implements AccountGatewayPort {
  public subscription: AccountSubscriptionData | null = null

  async getSubscription(
    _userId: string,
  ): Promise<AccountSubscriptionData | null> {
    return this.subscription
  }
}
