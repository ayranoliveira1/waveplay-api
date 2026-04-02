import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'

import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { Public } from '../decorators/public.decorator'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>

@Controller('/auth')
export class ForgotPasswordController {
  constructor(private forgotPasswordUseCase: ForgotPasswordUseCase) {}

  @Public()
  @Post('/forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async handle(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordBody,
  ) {
    const result = await this.forgotPasswordUseCase.execute({
      email: body.email,
    })

    return { success: true, data: result.value, error: null }
  }
}
