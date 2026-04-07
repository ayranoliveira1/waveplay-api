import type { AccountLockoutPort } from '@/modules/identity/application/ports/account-lockout.port'

const MAX_FAILURES = 5
const IP_MAX_FAILURES = 15

export class FakeAccountLockout implements AccountLockoutPort {
  private failures = new Map<string, number>()
  private locked = new Map<string, boolean>()
  private lockoutCounts = new Map<string, number>()
  private ipFailures = new Map<string, number>()
  private ipLocked = new Map<string, boolean>()

  async isLocked(email: string, ipAddress?: string): Promise<boolean> {
    if (this.locked.get(email)) return true
    if (ipAddress && this.ipLocked.get(ipAddress)) return true
    return false
  }

  async incrementFailures(email: string, ipAddress?: string): Promise<number> {
    const current = (this.failures.get(email) ?? 0) + 1
    this.failures.set(email, current)

    if (current >= MAX_FAILURES) {
      this.locked.set(email, true)
      const count = (this.lockoutCounts.get(email) ?? 0) + 1
      this.lockoutCounts.set(email, count)
    }

    if (ipAddress) {
      const ipCount = (this.ipFailures.get(ipAddress) ?? 0) + 1
      this.ipFailures.set(ipAddress, ipCount)

      if (ipCount >= IP_MAX_FAILURES) {
        this.ipLocked.set(ipAddress, true)
      }
    }

    return current
  }

  async resetFailures(email: string): Promise<void> {
    this.failures.delete(email)
    this.locked.delete(email)
  }

  // Test helpers
  getLockoutCount(email: string): number {
    return this.lockoutCounts.get(email) ?? 0
  }

  getIpFailures(ipAddress: string): number {
    return this.ipFailures.get(ipAddress) ?? 0
  }

  isIpLocked(ipAddress: string): boolean {
    return this.ipLocked.get(ipAddress) ?? false
  }

  resetIp(ipAddress: string): void {
    this.ipFailures.delete(ipAddress)
    this.ipLocked.delete(ipAddress)
  }
}
