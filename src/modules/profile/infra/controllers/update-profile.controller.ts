import {
  Controller,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { z } from 'zod'

import { UpdateProfileUseCase } from '../../application/use-cases/update-profile-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'
import { ProfilePresenter } from '../presenters/profile-presenter'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255).optional(),
  avatarUrl: z.string().max(2048).optional(),
  isKid: z.boolean().optional(),
})

type UpdateProfileBody = z.infer<typeof updateProfileSchema>

@Controller('/profiles')
export class UpdateProfileController {
  constructor(private updateProfileUseCase: UpdateProfileUseCase) {}

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileBody,
    @Param('id') id: string,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.updateProfileUseCase.execute({
      userId,
      profileId: id,
      name: body.name,
      avatarUrl: body.avatarUrl,
      isKid: body.isKid,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: { profile: ProfilePresenter.toHTTP(result.value.profile) },
      error: null,
    }
  }
}
