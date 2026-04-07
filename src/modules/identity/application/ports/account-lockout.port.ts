export abstract class AccountLockoutPort {
  abstract isLocked(email: string, ipAddress?: string): Promise<boolean>
  abstract incrementFailures(email: string, ipAddress?: string): Promise<number>
  abstract resetFailures(email: string): Promise<void>
}
