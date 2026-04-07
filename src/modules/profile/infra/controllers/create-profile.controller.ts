import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { z } from 'zod'

import { CreateProfileUseCase } from '../../application/use-cases/create-profile-use-case'
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'
import { ProfilePresenter } from '../presenters/profile-presenter'

const createProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  avatarUrl: z.string().url().max(2048).optional(),
  isKid: z.boolean().optional(),
})

type CreateProfileBody = z.infer<typeof createProfileSchema>

@Controller('/profiles')
export class CreateProfileController {
  constructor(private createProfileUseCase: CreateProfileUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async handle(
    @Body(new ZodValidationPipe(createProfileSchema)) body: CreateProfileBody,
    @GetUser('userId') userId: string,
  ) {
    const result = await this.createProfileUseCase.execute({
      userId,
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
