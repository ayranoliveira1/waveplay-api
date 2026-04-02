import { Injectable } from '@nestjs/common'
import { EnvService } from '@/shared/env/env.service'
import { AuthConfigPort } from '../../application/ports/auth-config.port'

const DURATION_REGEX = /^(\d+)(ms|s|m|h|d)$/

function parseDurationToMs(duration: string): number {
  const match = duration.match(DURATION_REGEX)

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`)
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return value * multipliers[unit]
}

@Injectable()
export class EnvAuthConfig implements AuthConfigPort {
  constructor(private env: EnvService) {}

  getAccessTokenExpiresIn(): string {
    return this.env.get('JWT_ACCESS_EXPIRES_IN')
  }

  getRefreshTokenExpiresInMs(): number {
    return parseDurationToMs(this.env.get('JWT_REFRESH_EXPIRES_IN'))
  }

  getFrontendUrl(): string {
    return this.env.get('FRONTEND_URL')
  }
}
