import type { ProfileOwnershipGatewayPort } from '@/modules/subscription/application/ports/profile-ownership-gateway.port'

export class FakeProfileOwnershipGateway implements ProfileOwnershipGatewayPort {
  public result = true
  public profileName = 'João'

  async validateOwnership(
    _profileId: string,
    _userId: string,
  ): Promise<boolean> {
    return this.result
  }

  async getProfileName(_profileId: string): Promise<string | null> {
    return this.profileName
  }
}
