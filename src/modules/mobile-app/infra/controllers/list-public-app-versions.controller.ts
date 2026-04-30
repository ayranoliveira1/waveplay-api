import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { ListAppVersionsUseCase } from '../../application/use-cases/list-app-versions-use-case'
import { MobileAppVersionPresenter } from '../presenters/mobile-app-version-presenter'
import { Public } from '@/modules/identity/infra/decorators/public.decorator'

@Controller('/app')
export class ListPublicAppVersionsController {
  constructor(private useCase: ListAppVersionsUseCase) {}

  @Public()
  @Get('versions')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async handle() {
    const result = await this.useCase.execute()

    return {
      success: true,
      data: {
        versions: result.value.versions.map(
          MobileAppVersionPresenter.toPublicHTTP,
        ),
      },
      error: null,
    }
  }
}
