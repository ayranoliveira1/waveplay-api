import { uuidv7 } from 'uuidv7'

export class UniqueEntityID {
  private value: string

  toString() {
    return this.value
  }

  toValue() {
    return this.value
  }

  constructor(value?: string) {
    this.value = value ?? uuidv7()
  }

  public equals(id: UniqueEntityID) {
    return id.toValue() === this.value
  }
}
