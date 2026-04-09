import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { z } from 'zod'

import { GetUserDetailUseCase } from '../../application/use-cases/get-user-detail-use-case'
import { AdminUserPresenter } from '../presenters/admin-user-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID inválido')

@Controller('/admin')
export class GetUserDetailController {
  constructor(private useCase: GetUserDetailUseCase) {}

  @Get('users/:id')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    const result = await this.useCase.execute({ userId: id })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: AdminUserPresenter.toDetailHTTP(result.value.user),
      error: null,
    }
  }
}
