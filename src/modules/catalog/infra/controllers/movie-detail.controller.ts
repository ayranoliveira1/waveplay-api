import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { z } from 'zod'

import { GetMovieDetailUseCase } from '../../application/use-cases/get-movie-detail-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { MoviePresenter } from '../presenters/movie-presenter'

const idSchema = z
  .string()
  .transform(Number)
  .pipe(z.number().int().min(1).max(99999999))

@Controller('/catalog/movies')
export class MovieDetailController {
  constructor(private getMovieDetailUseCase: GetMovieDetailUseCase) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id', new ZodValidationPipe(idSchema)) id: number) {
    const result = await this.getMovieDetailUseCase.execute({ id })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: { movie: MoviePresenter.toDetail(result.value.movie) },
      error: null,
    }
  }
}
