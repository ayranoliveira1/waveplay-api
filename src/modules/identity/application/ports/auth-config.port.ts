export abstract class AuthConfigPort {
  abstract getAccessTokenExpiresIn(): string
  abstract getRefreshTokenExpiresInMs(): number
  abstract getFrontendUrl(): string
}
