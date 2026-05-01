import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetByWatchProvidersUseCase } from '../../application/use-cases/get-by-watch-providers-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const providersSchema = z
  .string()
  .min(1)
  .transform((s) => s.split(',').map((v) => Number(v.trim())))
  .pipe(z.array(z.number().int().positive().max(99999)).min(1).max(10))

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1).max(500))

@Controller('/catalog')
export class ByWatchProvidersController {
  constructor(private getByWatchProvidersUseCase: GetByWatchProvidersUseCase) {}

  @Get('by-watch-providers')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Query('providers', new ZodValidationPipe(providersSchema))
    providers: number[],
    @Query('page', new ZodValidationPipe(pageSchema)) page: number,
  ) {
    const result = await this.getByWatchProvidersUseCase.execute({
      providers,
      page,
    })

    return { success: true, data: result.value, error: null }
  }
}
