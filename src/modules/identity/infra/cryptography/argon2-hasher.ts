import { Injectable } from '@nestjs/common'
import { hash, verify } from 'argon2'
import { HasherPort } from '../../application/ports/hasher.port'

@Injectable()
export class Argon2Hasher implements HasherPort {
  async hash(plain: string): Promise<string> {
    return hash(plain, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
      type: 2, // argon2id
    })
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return verify(hashed, plain)
  }
}
