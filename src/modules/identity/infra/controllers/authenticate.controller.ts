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

import { AuthenticateUseCase } from '../../application/use-cases/authenticate-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { Public } from '../decorators/public.decorator'
import { UserPresenter } from '../presenters/user-presenter'
import { isMobile, setRefreshTokenCookie } from './platform-utils'

const authenticateSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string(),
})

type AuthenticateBody = z.infer<typeof authenticateSchema>

@Controller('/auth')
export class AuthenticateController {
  constructor(private authenticateUseCase: AuthenticateUseCase) {}

  @Public()
  @Post('/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async handle(@Body(new ZodValidationPipe(authenticateSchema)) body: AuthenticateBody, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authenticateUseCase.execute({
      email: body.email,
      password: body.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    const { user, accessToken, refreshToken } = result.value

    if (isMobile(req)) {
      return {
        success: true,
        data: {
          user: UserPresenter.toHTTP(user),
          accessToken,
          refreshToken,
        },
        error: null,
      }
    }

    setRefreshTokenCookie(res, refreshToken)

    return {
      success: true,
      data: {
        user: UserPresenter.toHTTP(user),
        accessToken,
      },
      error: null,
    }
  }
}
