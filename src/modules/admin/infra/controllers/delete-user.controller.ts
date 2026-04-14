import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { z } from 'zod'

import { DeleteUserUseCase } from '../../application/use-cases/delete-user-use-case'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

const idSchema = z.string().uuid('ID inválido')

@Controller('/admin')
export class DeleteUserController {
  constructor(private useCase: DeleteUserUseCase) {}

  @Delete('users/:id')
  @Admin()
  @HttpCode(HttpStatus.NO_CONTENT)
  async handle(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
  ): Promise<void> {
    const result = await this.useCase.execute({ userId: id })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }
  }
}
