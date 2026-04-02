export abstract class UserPlanGatewayPort {
  abstract getMaxProfiles(userId: string): Promise<number>
}
