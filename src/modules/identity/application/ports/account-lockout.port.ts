export abstract class AccountLockoutPort {
  abstract isLocked(email: string): Promise<boolean>
  abstract incrementFailures(email: string): Promise<number>
  abstract resetFailures(email: string): Promise<void>
}
