import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/database/prisma.service'
import {
  PasswordResetTokenProps,
  PasswordResetTokensRepository,
} from '../../domain/repositories/password-reset-tokens-repository'
import { PrismaPasswordResetTokenMapper } from '../mappers/prisma-password-reset-token-mapper'

@Injectable()
export class PrismaPasswordResetTokensRepository
  implements PasswordResetTokensRepository
{
  constructor(private prisma: PrismaService) {}

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenProps | null> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!token) {
      return null
    }

    return PrismaPasswordResetTokenMapper.toDomain(token)
  }

  async create(token: PasswordResetTokenProps): Promise<void> {
    const data = PrismaPasswordResetTokenMapper.toPrisma(token)

    await this.prisma.passwordResetToken.create({ data })
  }

  async markAsUsed(tokenHash: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    })
  }
}
