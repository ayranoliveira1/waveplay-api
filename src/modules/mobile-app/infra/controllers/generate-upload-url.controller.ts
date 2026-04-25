import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { z } from 'zod'

import { GenerateUploadUrlUseCase } from '../../application/use-cases/generate-upload-url-use-case'
import { Admin } from '@/modules/admin/infra/decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { SEMVER_REGEX } from '../../domain/semver'

const bodySchema = z.object({
  version: z
    .string()
    .regex(SEMVER_REGEX, 'Versao deve seguir formato semver (X.Y.Z)'),
})

type BodySchema = z.infer<typeof bodySchema>

@Controller('/admin')
export class GenerateUploadUrlController {
  constructor(private useCase: GenerateUploadUrlUseCase) {}

  @Post('app-versions/upload-url')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(@Body(new ZodValidationPipe(bodySchema)) body: BodySchema) {
    const result = await this.useCase.execute({ version: body.version })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: {
        uploadUrl: result.value.uploadUrl,
        storageKey: result.value.storageKey,
        expiresAt: result.value.expiresAt,
      },
      error: null,
    }
  }
}
