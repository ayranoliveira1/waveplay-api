import type { AuthConfigPort } from '@/modules/identity/application/ports/auth-config.port'

export class FakeAuthConfig implements AuthConfigPort {
  getAccessTokenExpiresIn(): string {
    return '15m'
  }

  getRefreshTokenExpiresInMs(): number {
    return 48 * 60 * 60 * 1000
  }

  getFrontendUrl(): string {
    return 'http://localhost:3000'
  }
}
