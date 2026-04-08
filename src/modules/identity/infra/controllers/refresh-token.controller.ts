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

import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token-use-case'
import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { Public } from '../decorators/public.decorator'
import { isMobile, setRefreshTokenCookie } from './platform-utils'

const refreshTokenSchema = z
  .object({
    refreshToken: z.string().optional(),
  })
  .default({})

@Controller('/auth')
export class RefreshTokenController {
  constructor(private refreshTokenUseCase: RefreshTokenUseCase) {}

  @Public()
  @Post('/refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async handle(
    @Body(new ZodValidationPipe(refreshTokenSchema))
    body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const mobile = isMobile(req)
    const rawToken = mobile
      ? body.refreshToken
      : (req.cookies?.refreshToken as string | undefined)

    if (!rawToken) {
      throw new CustomHttpException(new InvalidRefreshTokenError())
    }

    const result = await this.refreshTokenUseCase.execute({
      refreshToken: rawToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    const { accessToken, refreshToken } = result.value

    if (mobile) {
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
