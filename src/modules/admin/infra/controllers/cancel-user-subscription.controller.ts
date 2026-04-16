import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { z } from 'zod'

import { CancelUserSubscriptionUseCase } from '../../application/use-cases/cancel-user-subscription-use-case'
import { AdminUserPresenter } from '../presenters/admin-user-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID inválido')

@Controller('/admin')
export class CancelUserSubscriptionController {
  constructor(private useCase: CancelUserSubscriptionUseCase) {}

  @Delete('users/:id/subscription')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    const result = await this.useCase.execute({ userId: id })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: {
        subscription: AdminUserPresenter.toSubscriptionHTTP(
          result.value.subscription,
        ),
      },
      error: null,
    }
  }
}
