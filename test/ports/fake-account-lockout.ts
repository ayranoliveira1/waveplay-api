import type { AccountLockoutPort } from '@/modules/identity/application/ports/account-lockout.port'

export class FakeAccountLockout implements AccountLockoutPort {
  private failures = new Map<string, number>()
  private locked = new Map<string, boolean>()

  async isLocked(email: string): Promise<boolean> {
    return this.locked.get(email) ?? false
  }

  async incrementFailures(email: string): Promise<number> {
    const current = (this.failures.get(email) ?? 0) + 1
    this.failures.set(email, current)

    if (current >= 5) {
      this.locked.set(email, true)
    }

    return current
  }

  async resetFailures(email: string): Promise<void> {
    this.failures.delete(email)
    this.locked.delete(email)
  }
}
