import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { z } from 'zod'

import { DeleteAppVersionUseCase } from '../../application/use-cases/delete-app-version-use-case'
import { Admin } from '@/modules/admin/infra/decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID invalido')

@Controller('/admin')
export class DeleteAppVersionController {
  constructor(private useCase: DeleteAppVersionUseCase) {}

  @Delete('app-versions/:id')
  @Admin()
  @HttpCode(HttpStatus.NO_CONTENT)
  async handle(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
  ): Promise<void> {
    const result = await this.useCase.execute({ versionId: id })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }
  }
}
