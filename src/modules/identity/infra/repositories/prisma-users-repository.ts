import { Injectable } from '@nestjs/common'
import { Prisma } from '@/shared/database/generated/prisma'
import { PrismaService } from '@/shared/database/prisma.service'
import { UsersRepository } from '../../domain/repositories/users-repository'
import { User } from '../../domain/entities/user'
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error'
import { PrismaUserMapper } from '../mappers/prisma-user-mapper'

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return null
    }

    return PrismaUserMapper.toDomain(user)
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return null
    }

    return PrismaUserMapper.toDomain(user)
  }

  async create(user: User): Promise<void> {
    const data = PrismaUserMapper.toPrisma(user)

    try {
      await this.prisma.user.create({ data })
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new EmailAlreadyExistsError()
      }

      throw error as Error
    }
  }

  async save(user: User): Promise<void> {
    const data = PrismaUserMapper.toPrisma(user)

    await this.prisma.user.update({
      where: { id: user.id.toValue() },
      data,
    })
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } })
  }
}
