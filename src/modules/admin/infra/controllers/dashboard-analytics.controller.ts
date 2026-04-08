import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetDashboardAnalyticsUseCase } from '../../application/use-cases/get-dashboard-analytics-use-case'
import { AnalyticsPresenter } from '../presenters/analytics-presenter'
import { Admin } from '../decorators/admin.decorator'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (use YYYY-MM-DD)')
  .optional()
  .transform((val) => (val ? new Date(val) : undefined))

@Controller('/admin')
export class DashboardAnalyticsController {
  constructor(private useCase: GetDashboardAnalyticsUseCase) {}

  @Get('analytics')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Query('startDate', new ZodValidationPipe(dateSchema))
    startDate?: Date,
    @Query('endDate', new ZodValidationPipe(dateSchema))
    endDate?: Date,
  ) {
    const result = await this.useCase.execute({ startDate, endDate })

    const { overview, period } = result.value

    return {
      success: true,
      data: AnalyticsPresenter.toHTTP(overview, period),
      error: null,
    }
  }
}
