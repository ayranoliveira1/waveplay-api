import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { z } from 'zod'

import { ListFavoritesUseCase } from '../../application/use-cases/list-favorites-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'
import { MediaListPresenter } from '../presenters/media-list-presenter'

const profileIdSchema = z.string().uuid()

const pageSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().int().min(1))

@Controller('/favorites')
export class ListFavoritesController {
  constructor(private listFavoritesUseCase: ListFavoritesUseCase) {}

  @Get(':profileId')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('profileId', new ZodValidationPipe(profileIdSchema))
    profileId: string,
    @Query('page', new ZodValidationPipe(pageSchema)) page: number,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.listFavoritesUseCase.execute({
      userId,
      profileId,
      page,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: {
        favorites: result.value.favorites.map(MediaListPresenter.toHTTP),
        page: result.value.page,
        totalPages: result.value.totalPages,
      },
      error: null,
    }
  }
}
