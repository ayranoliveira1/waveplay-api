export abstract class EncrypterPort {
  abstract sign(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string },
  ): Promise<string>
  abstract verify(token: string): Promise<Record<string, unknown>>
}
