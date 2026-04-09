import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { z } from 'zod'

import { AdminCreateUserUseCase } from '../../application/use-cases/admin-create-user-use-case'
import { AdminUserPresenter } from '../presenters/admin-user-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const bodySchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    email: z.string().email('Email inválido'),
    password: z.string().min(8).max(128),
    planId: z.string().uuid('ID de plano inválido'),
  })
  .strict()

type CreateUserBody = z.infer<typeof bodySchema>

@Controller('/admin')
export class AdminCreateUserController {
  constructor(private useCase: AdminCreateUserUseCase) {}

  @Post('users')
  @Admin()
  @HttpCode(HttpStatus.CREATED)
  async handle(@Body(new ZodValidationPipe(bodySchema)) body: CreateUserBody) {
    const result = await this.useCase.execute({
      name: body.name,
      email: body.email,
      password: body.password,
      planId: body.planId,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: AdminUserPresenter.toCreatedHTTP(result.value.user),
      error: null,
    }
  }
}
