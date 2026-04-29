import { Body, Controller, HttpCode, HttpStatus, Patch } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'

import { ChangePasswordUseCase } from '../../application/use-cases/change-password-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '../decorators/get-user.decorator'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z.string().min(1, 'Nova senha obrigatória'),
  })
  .strict()

type ChangePasswordBody = z.infer<typeof changePasswordSchema>

@Controller('/auth')
export class ChangePasswordController {
  constructor(private changePasswordUseCase: ChangePasswordUseCase) {}

  @Patch('/password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async handle(
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordBody,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.changePasswordUseCase.execute({
      userId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return { success: true, data: result.value, error: null }
  }
}
