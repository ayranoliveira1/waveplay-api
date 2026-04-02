import { UserPlanGatewayPort } from '@/modules/profile/application/ports/user-plan-gateway.port'

export class FakeUserPlanGateway implements UserPlanGatewayPort {
  public maxProfiles = 3

  async getMaxProfiles(_userId: string): Promise<number> {
    return this.maxProfiles
  }
}
