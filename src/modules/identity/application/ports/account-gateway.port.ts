export interface AccountPlanData {
  id: string
  name: string
  slug: string
  maxProfiles: number
  maxStreams: number
}

export interface AccountSubscriptionData {
  id: string
  status: string
  startedAt: Date
  endsAt: Date | null
  plan: AccountPlanData
}

export abstract class AccountGatewayPort {
  abstract getSubscription(
    userId: string,
  ): Promise<AccountSubscriptionData | null>
}
