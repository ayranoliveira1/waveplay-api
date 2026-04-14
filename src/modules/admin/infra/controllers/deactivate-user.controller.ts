import { Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common'
import { z } from 'zod'

import { DeactivateUserUseCase } from '../../application/use-cases/deactivate-user-use-case'
import { AdminUserPresenter } from '../presenters/admin-user-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID inválido')

@Controller('/admin')
export class DeactivateUserController {
  constructor(private useCase: DeactivateUserUseCase) {}

  @Patch('users/:id/deactivate')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    const result = await this.useCase.execute({ userId: id })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: { user: AdminUserPresenter.toUpdatedHTTP(result.value.user) },
      error: null,
    }
  }
}
