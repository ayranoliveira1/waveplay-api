import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common'
import { z } from 'zod'

import { AdminUpdateUserUseCase } from '../../application/use-cases/admin-update-user-use-case'
import { AdminUserPresenter } from '../presenters/admin-user-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID inválido')

const bodySchema = z
  .object({
    name: z.string().min(2, 'Nome muito curto').max(120).optional(),
    email: z.string().email('Email inválido').toLowerCase().max(255).optional(),
  })
  .strict()
  .refine((b) => b.name !== undefined || b.email !== undefined, {
    message: 'Pelo menos um campo (name ou email) deve ser fornecido',
  })

type UpdateUserBody = z.infer<typeof bodySchema>

@Controller('/admin')
export class AdminUpdateUserController {
  constructor(private useCase: AdminUpdateUserUseCase) {}

  @Patch('users/:id')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(bodySchema)) body: UpdateUserBody,
  ) {
    const result = await this.useCase.execute({
      userId: id,
      name: body.name,
      email: body.email,
    })

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
