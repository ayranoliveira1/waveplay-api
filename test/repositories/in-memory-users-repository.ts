import type { UsersRepository } from '@/modules/identity/domain/repositories/users-repository'
import type { User } from '@/modules/identity/domain/entities/user'
import { EmailAlreadyExistsError } from '@/modules/identity/domain/errors/email-already-exists.error'

export class InMemoryUsersRepository implements UsersRepository {
  public items: User[] = []

  async findById(id: string): Promise<User | null> {
    return this.items.find((user) => user.id.toValue() === id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.items.find((user) => user.email === email) ?? null
  }

  async create(user: User): Promise<void> {
    const exists = this.items.some((item) => item.email === user.email)

    if (exists) {
      throw new EmailAlreadyExistsError()
    }

    this.items.push(user)
  }

  async save(user: User): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(user.id))

    if (index >= 0) {
      this.items[index] = user
    }
  }

  async delete(userId: string): Promise<void> {
    this.items = this.items.filter((user) => user.id.toValue() !== userId)
  }
}
