import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common'
import { z } from 'zod'

import { UpdatePlanUseCase } from '../../application/use-cases/update-plan-use-case'
import { AdminPlanPresenter } from '../presenters/admin-plan-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID inválido')

const bodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    priceCents: z.number().int().nonnegative().optional(),
    maxProfiles: z.number().int().min(1).optional(),
    maxStreams: z.number().int().min(1).optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido',
  })

type UpdatePlanBody = z.infer<typeof bodySchema>

@Controller('/admin')
export class UpdatePlanController {
  constructor(private useCase: UpdatePlanUseCase) {}

  @Patch('plans/:id')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(bodySchema)) body: UpdatePlanBody,
  ) {
    const result = await this.useCase.execute({
      planId: id,
      name: body.name,
      priceCents: body.priceCents,
      maxProfiles: body.maxProfiles,
      maxStreams: body.maxStreams,
      description: body.description,
    })

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
