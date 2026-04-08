import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { RegisterUseCase } from '../../application/use-cases/register-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { Public } from '../decorators/public.decorator'
import { isMobile, setRefreshTokenCookie } from './platform-utils'

const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string(),
  confirmPassword: z.string(),
})

type RegisterBody = z.infer<typeof registerSchema>

@Controller('/auth')
export class RegisterController {
  constructor(private registerUseCase: RegisterUseCase) {}

  @Public()
  @Post('/register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async handle(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.registerUseCase.execute({
      name: body.name,
      email: body.email,
      password: body.password,
      confirmPassword: body.confirmPassword,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    const { accessToken, refreshToken } = result.value

    if (isMobile(req)) {
      return {
        success: true,
        data: { accessToken, refreshToken },
        error: null,
      }
    }

    setRefreshTokenCookie(res, refreshToken)

    return {
      success: true,
      data: { accessToken },
      error: null,
    }
  }
}
