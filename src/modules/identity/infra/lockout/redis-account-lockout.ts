import { Inject, Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'
import { AccountLockoutPort } from '../../application/ports/account-lockout.port'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'

const MAX_FAILURES = 5
const IP_MAX_FAILURES = 15
const BASE_LOCKOUT_SECONDS = 15 * 60 // 15 minutos
const MAX_LOCKOUT_SECONDS = 24 * 60 * 60 // 24 horas
const IP_LOCKOUT_SECONDS = 15 * 60 // 15 minutos
const LOCKOUT_COUNT_TTL_SECONDS = 24 * 60 * 60 // 24h para resetar backoff

@Injectable()
export class RedisAccountLockout implements AccountLockoutPort {
  private readonly logger = new Logger(RedisAccountLockout.name)

  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async isLocked(email: string, ipAddress?: string): Promise<boolean> {
    const emailLocked = await this.redis.get(`lockout:${email}:locked`)

    if (emailLocked) return true

    if (ipAddress) {
      const ipLocked = await this.redis.get(`lockout:ip:${ipAddress}:locked`)
      if (ipLocked) return true
    }

    return false
  }

  async incrementFailures(email: string, ipAddress?: string): Promise<number> {
    const key = `lockout:${email}:failures`
    const current = await this.redis.incr(key)
    await this.redis.expire(key, BASE_LOCKOUT_SECONDS)

    if (current >= MAX_FAILURES) {
      await this.lockEmail(email)
    }

    if (ipAddress) {
      await this.incrementIpFailures(ipAddress)
    }

    return current
  }

  async resetFailures(email: string): Promise<void> {
    await this.redis.del(`lockout:${email}:failures`, `lockout:${email}:locked`)
  }

  private async lockEmail(email: string): Promise<void> {
    const countKey = `lockout:${email}:lockout_count`
    const lockoutCount = await this.redis.incr(countKey)
    await this.redis.expire(countKey, LOCKOUT_COUNT_TTL_SECONDS)

    const lockoutTTL = Math.min(
      BASE_LOCKOUT_SECONDS * Math.pow(2, lockoutCount - 1),
      MAX_LOCKOUT_SECONDS,
    )

    await this.redis.set(`lockout:${email}:locked`, '1', 'EX', lockoutTTL)

    this.logger.warn(
      `Account locked: ${email} (attempt #${lockoutCount}, TTL: ${lockoutTTL}s)`,
    )
  }

  private async incrementIpFailures(ipAddress: string): Promise<void> {
    const key = `lockout:ip:${ipAddress}:failures`
    const current = await this.redis.incr(key)
    await this.redis.expire(key, IP_LOCKOUT_SECONDS)

    if (current >= IP_MAX_FAILURES) {
      await this.redis.set(
        `lockout:ip:${ipAddress}:locked`,
        '1',
        'EX',
        IP_LOCKOUT_SECONDS,
      )

      this.logger.warn(
        `IP blocked: ${ipAddress} (${current} failures across multiple emails)`,
      )
    }
  }
}
