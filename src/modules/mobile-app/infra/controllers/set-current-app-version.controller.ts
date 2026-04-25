import { Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common'
import { z } from 'zod'

import { SetCurrentAppVersionUseCase } from '../../application/use-cases/set-current-app-version-use-case'
import { MobileAppVersionPresenter } from '../presenters/mobile-app-version-presenter'
import { Admin } from '@/modules/admin/infra/decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID invalido')

@Controller('/admin')
export class SetCurrentAppVersionController {
  constructor(private useCase: SetCurrentAppVersionUseCase) {}

  @Patch('app-versions/:id/current')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    const result = await this.useCase.execute({ versionId: id })

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
