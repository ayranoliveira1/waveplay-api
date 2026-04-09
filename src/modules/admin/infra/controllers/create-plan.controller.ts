import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { z } from 'zod'

import { CreatePlanUseCase } from '../../application/use-cases/create-plan-use-case'
import { AdminPlanPresenter } from '../presenters/admin-plan-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const bodySchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    slug: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug inválido'),
    priceCents: z.number().int().nonnegative(),
    maxProfiles: z.number().int().min(1),
    maxStreams: z.number().int().min(1),
    description: z.string().max(500).optional(),
  })
  .strict()

type CreatePlanBody = z.infer<typeof bodySchema>

@Controller('/admin')
export class CreatePlanController {
  constructor(private useCase: CreatePlanUseCase) {}

  @Post('plans')
  @Admin()
  @HttpCode(HttpStatus.CREATED)
  async handle(@Body(new ZodValidationPipe(bodySchema)) body: CreatePlanBody) {
    const result = await this.useCase.execute({
      name: body.name,
      slug: body.slug,
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
