import { Controller, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common'

import { DeleteProfileUseCase } from '../../application/use-cases/delete-profile-use-case'
import { CustomHttpException } from '@/shared/http/custom-http.exception'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'

@Controller('/profiles')
export class DeleteProfileController {
  constructor(private deleteProfileUseCase: DeleteProfileUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async handle(@Param('id') id: string, @GetUser('userId') userId: string) {
    const result = await this.deleteProfileUseCase.execute({
      userId,
      profileId: id,
    })

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: null,
      error: null,
    }
  }
}
