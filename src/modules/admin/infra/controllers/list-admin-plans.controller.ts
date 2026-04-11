import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

import { ListAdminPlansUseCase } from '../../application/use-cases/list-admin-plans-use-case'
import { AdminPlanPresenter } from '../presenters/admin-plan-presenter'
import { Admin } from '../decorators/admin.decorator'

@Controller('/admin')
export class ListAdminPlansController {
  constructor(private useCase: ListAdminPlansUseCase) {}

  @Get('plans')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle() {
    const result = await this.useCase.execute()

    return {
      success: true,
      data: {
        plans: result.value.plans.map(AdminPlanPresenter.toHTTP),
      },
      error: null,
    }
  }
}
