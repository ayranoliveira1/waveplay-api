import { randomBytes } from 'node:crypto'

interface UniqueCodeRules {
  length: number
  chars: string
}

function createUniqueCode(
  { chars, length }: UniqueCodeRules = {
    length: 10,
    chars: 'abcdefghijklmnopqrstuvwxyz1234567890',
  },
) {
  const bytes = randomBytes(length)
  let code = ''

  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length].toUpperCase()
  }

  return code
}

export class UniqueCode {
  private value: string

  constructor(rules: UniqueCodeRules, value?: string) {
    this.value = value ?? createUniqueCode(rules)
  }

  toValue() {
    return this.value
  }
}
