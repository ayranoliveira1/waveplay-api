import { Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common'
import { z } from 'zod'

import { TogglePlanActiveUseCase } from '../../application/use-cases/toggle-plan-active-use-case'
import { AdminPlanPresenter } from '../presenters/admin-plan-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID inválido')

@Controller('/admin')
export class TogglePlanActiveController {
  constructor(private useCase: TogglePlanActiveUseCase) {}

  @Patch('plans/:id/toggle')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    const result = await this.useCase.execute({ planId: id })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: { plan: AdminPlanPresenter.toHTTP(result.value.plan) },
      error: null,
    }
  }
}
