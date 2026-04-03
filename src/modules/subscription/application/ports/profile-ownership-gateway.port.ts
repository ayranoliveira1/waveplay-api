export abstract class ProfileOwnershipGatewayPort {
  abstract validateOwnership(
    profileId: string,
    userId: string,
  ): Promise<boolean>
  abstract getProfileName(profileId: string): Promise<string | null>
}
