import { User } from '../../domain/entities/user'

export class UserPresenter {
  static toHTTP(user: User) {
    return {
      id: user.id.toValue(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    }
  }
}
