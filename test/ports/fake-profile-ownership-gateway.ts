import type { ProfileOwnershipGatewayPort } from '@/modules/subscription/application/ports/profile-ownership-gateway.port'

export class FakeProfileOwnershipGateway implements ProfileOwnershipGatewayPort {
  public result = true

  async validateOwnership(
    _profileId: string,
    _userId: string,
  ): Promise<boolean> {
    return this.result
  }
}
