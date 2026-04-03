import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

import { GetSeriesGenresUseCase } from '../../application/use-cases/get-series-genres-use-case'
import { GenrePresenter } from '../presenters/genre-presenter'

@Controller('/catalog/genres')
export class SeriesGenresController {
  constructor(private getSeriesGenresUseCase: GetSeriesGenresUseCase) {}

  @Get('series')
  @HttpCode(HttpStatus.OK)
  async handle() {
    const result = await this.getSeriesGenresUseCase.execute()

    return {
      success: true,
      data: { genres: result.value.genres.map(GenrePresenter.toHTTP) },
      error: null,
    }
  }
}
