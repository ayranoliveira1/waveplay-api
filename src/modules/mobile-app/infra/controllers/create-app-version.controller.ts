import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import { z } from 'zod'

import { CreateAppVersionUseCase } from '../../application/use-cases/create-app-version-use-case'
import { MobileAppVersionPresenter } from '../presenters/mobile-app-version-presenter'
import { Admin } from '@/modules/admin/infra/decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { SEMVER_REGEX } from '../../domain/semver'

const bodySchema = z.object({
  version: z.string().regex(SEMVER_REGEX),
  storageKey: z.string().min(1),
  fileSize: z.number().int().positive(),
  releaseNotes: z.string().optional(),
  forceUpdate: z.boolean().optional(),
})

type BodySchema = z.infer<typeof bodySchema>

interface AuthRequest extends Request {
  user?: { userId: string; role: string }
}

@Controller('/admin')
export class CreateAppVersionController {
  constructor(private useCase: CreateAppVersionUseCase) {}

  @Post('app-versions')
  @Admin()
  @HttpCode(HttpStatus.CREATED)
  async handle(
    @Body(new ZodValidationPipe(bodySchema)) body: BodySchema,
    @Req() req: AuthRequest,
  ) {
    const result = await this.useCase.execute({
      ...body,
      publishedBy: req.user!.userId,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: {
        version: MobileAppVersionPresenter.toAdminHTTP(result.value.version),
      },
      error: null,
    }
  }
}
