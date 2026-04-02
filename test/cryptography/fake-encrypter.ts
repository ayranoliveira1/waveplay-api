import type { EncrypterPort } from '@/modules/identity/application/ports/encrypter.port'

export class FakeEncrypter implements EncrypterPort {
  async sign(
    payload: Record<string, unknown>,
    _options?: { expiresIn?: string },
  ): Promise<string> {
    return `fake-token-${JSON.stringify(payload)}`
  }

  async verify(token: string): Promise<Record<string, unknown>> {
    const json = token.replace('fake-token-', '')
    return JSON.parse(json)
  }
}
