import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

import { GetMovieGenresUseCase } from '../../application/use-cases/get-movie-genres-use-case'
import { GenrePresenter } from '../presenters/genre-presenter'

@Controller('/catalog/genres')
export class MovieGenresController {
  constructor(private getMovieGenresUseCase: GetMovieGenresUseCase) {}

  @Get('movies')
  @HttpCode(HttpStatus.OK)
  async handle() {
    const result = await this.getMovieGenresUseCase.execute()

    return {
      success: true,
      data: { genres: result.value.genres.map(GenrePresenter.toHTTP) },
      error: null,
    }
  }
}
