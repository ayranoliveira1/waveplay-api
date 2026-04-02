import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'
import { AccountLockoutPort } from '../../application/ports/account-lockout.port'
import { REDIS_CLIENT } from '@/shared/redis/redis.module'

const MAX_FAILURES = 5
const LOCKOUT_TTL_SECONDS = 30 * 60 // 30 minutos

@Injectable()
export class RedisAccountLockout implements AccountLockoutPort {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async isLocked(email: string): Promise<boolean> {
    const locked = await this.redis.get(`lockout:${email}:locked`)
    return locked !== null
  }

  async incrementFailures(email: string): Promise<number> {
    const key = `lockout:${email}:failures`
    const current = await this.redis.incr(key)
    await this.redis.expire(key, LOCKOUT_TTL_SECONDS)

    if (current >= MAX_FAILURES) {
      await this.redis.set(
        `lockout:${email}:locked`,
        '1',
        'EX',
        LOCKOUT_TTL_SECONDS,
      )
    }

    return current
  }

  async resetFailures(email: string): Promise<void> {
    await this.redis.del(`lockout:${email}:failures`, `lockout:${email}:locked`)
  }
}
