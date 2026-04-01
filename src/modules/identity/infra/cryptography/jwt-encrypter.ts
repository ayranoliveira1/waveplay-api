import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { EncrypterPort } from '../../application/ports/encrypter.port'

@Injectable()
export class JwtEncrypter implements EncrypterPort {
  constructor(private jwt: JwtService) {}

  async sign(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string },
  ): Promise<string> {
    return this.jwt.signAsync(payload, {
      expiresIn: options?.expiresIn as string | undefined,
    } as Record<string, unknown>)
  }

  async verify(token: string): Promise<Record<string, unknown>> {
    return this.jwt.verifyAsync(token)
  }
}
