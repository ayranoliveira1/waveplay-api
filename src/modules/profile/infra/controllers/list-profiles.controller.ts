import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

import { ListProfilesUseCase } from '../../application/use-cases/list-profiles-use-case'
import { GetUser } from '@/modules/identity/infra/decorators/get-user.decorator'
import { ProfilePresenter } from '../presenters/profile-presenter'

@Controller('/profiles')
export class ListProfilesController {
  constructor(private listProfilesUseCase: ListProfilesUseCase) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async handle(@GetUser('userId') userId: string) {
    const result = await this.listProfilesUseCase.execute({ userId })

    const { profiles, maxProfiles } = result.value

    return {
      success: true,
      data: {
        profiles: profiles.map(ProfilePresenter.toHTTP),
        maxProfiles,
      },
      error: null,
    }
  }
}
