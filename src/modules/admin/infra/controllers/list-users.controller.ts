import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { ListUsersUseCase } from '../../application/use-cases/list-users-use-case'
import { AdminUserPresenter } from '../presenters/admin-user-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1))

const perPageSchema = z
  .string()
  .optional()
  .default('20')
  .transform(Number)
  .pipe(z.number().int().min(1).max(100))

const searchSchema = z.string().min(1).max(100).optional()

@Controller('/admin')
export class ListUsersController {
  constructor(private useCase: ListUsersUseCase) {}

  @Get('users')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Query('page', new ZodValidationPipe(pageSchema)) page: number,
    @Query('perPage', new ZodValidationPipe(perPageSchema)) perPage: number,
    @Query('search', new ZodValidationPipe(searchSchema)) search?: string,
  ) {
    const result = await this.useCase.execute({ page, perPage, search })

    const { users, page: currentPage, totalPages, totalItems } = result.value

    return {
      success: true,
      data: {
        users: users.map((user) => AdminUserPresenter.toListHTTP(user)),
        page: currentPage,
        totalPages,
        totalItems,
      },
      error: null,
    }
  }
}
