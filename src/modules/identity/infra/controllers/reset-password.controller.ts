import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'

import { ResetPasswordUseCase } from '../../application/use-cases/reset-password-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { Public } from '../decorators/public.decorator'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: z.string(),
})

type ResetPasswordBody = z.infer<typeof resetPasswordSchema>

@Controller('/auth')
export class ResetPasswordController {
  constructor(private resetPasswordUseCase: ResetPasswordUseCase) {}

  @Public()
  @Post('/reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async handle(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordBody) {
    const result = await this.resetPasswordUseCase.execute({
      token: body.token,
      newPassword: body.password,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return { success: true, data: result.value, error: null }
  }
}
