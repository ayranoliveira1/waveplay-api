import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

import { ListPlansUseCase } from '../../application/use-cases/list-plans-use-case'
import { Public } from '@/modules/identity/infra/decorators/public.decorator'
import { PlanPresenter } from '../presenters/plan-presenter'

@Controller('/plans')
export class ListPlansController {
  constructor(private listPlansUseCase: ListPlansUseCase) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async handle() {
    const result = await this.listPlansUseCase.execute()

    const { plans } = result.value

    return {
      success: true,
      data: {
        plans: plans.map(PlanPresenter.toHTTP),
      },
      error: null,
    }
  }
}
