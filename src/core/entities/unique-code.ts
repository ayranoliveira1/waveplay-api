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
  let code: string = ''

  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)].toUpperCase()
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
