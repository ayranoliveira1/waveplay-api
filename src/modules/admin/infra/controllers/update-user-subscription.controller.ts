import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common'
import { z } from 'zod'

import { UpdateUserSubscriptionUseCase } from '../../application/use-cases/update-user-subscription-use-case'
import { AdminUserPresenter } from '../presenters/admin-user-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID inválido')

const bodySchema = z
  .object({
    planId: z.string().uuid('ID de plano inválido'),
    endsAt: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .transform((v) => (v == null ? v : new Date(v))),
  })
  .strict()

type UpdateSubscriptionBody = z.infer<typeof bodySchema>

@Controller('/admin')
export class UpdateUserSubscriptionController {
  constructor(private useCase: UpdateUserSubscriptionUseCase) {}

  @Patch('users/:id/subscription')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(bodySchema)) body: UpdateSubscriptionBody,
  ) {
    const result = await this.useCase.execute({
      userId: id,
      planId: body.planId,
      endsAt: body.endsAt,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: {
        subscription: AdminUserPresenter.toSubscriptionHTTP(
          result.value.subscription,
        ),
        warning: result.value.warning,
      },
      error: null,
    }
  }
}
