import { HasherPort } from '@/modules/identity/application/ports/hasher.port'

export class FakeHasher implements HasherPort {
  async hash(plain: string): Promise<string> {
    return `${plain}-hashed`
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return `${plain}-hashed` === hashed
  }
}
