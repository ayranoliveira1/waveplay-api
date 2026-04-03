import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { z } from 'zod'

import { GetNowPlayingMoviesUseCase } from '../../application/use-cases/get-now-playing-movies-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1))

@Controller('/catalog/movies')
export class NowPlayingMoviesController {
  constructor(private getNowPlayingMoviesUseCase: GetNowPlayingMoviesUseCase) {}

  @Get('now-playing')
  @HttpCode(HttpStatus.OK)
  async handle(@Query('page', new ZodValidationPipe(pageSchema)) page: number) {
    const result = await this.getNowPlayingMoviesUseCase.execute({ page })
    return { success: true, data: result.value, error: null }
  }
}
