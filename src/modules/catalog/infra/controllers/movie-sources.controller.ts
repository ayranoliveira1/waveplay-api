import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { z } from 'zod'

import { GetMovieSourcesUseCase } from '../../application/use-cases/get-movie-sources-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'

const idSchema = z
  .string()
  .transform(Number)
  .pipe(z.number().int().min(1).max(99999999))

@Controller('/catalog/movies')
export class MovieSourcesController {
  constructor(private getMovieSourcesUseCase: GetMovieSourcesUseCase) {}

  @Get(':id/sources')
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id', new ZodValidationPipe(idSchema)) id: number) {
    const result = await this.getMovieSourcesUseCase.execute({ id })

    return {
      success: true,
      data: { sources: result.value.sources },
      error: null,
    }
  }
}
