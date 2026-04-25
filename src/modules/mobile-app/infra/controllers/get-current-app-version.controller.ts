import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { GetCurrentAppVersionUseCase } from '../../application/use-cases/get-current-app-version-use-case'
import { MobileAppVersionPresenter } from '../presenters/mobile-app-version-presenter'
import { Public } from '@/modules/identity/infra/decorators/public.decorator'
import { CustomHttpException } from '@/shared/http/custom-http.exception'

@Controller('/app')
export class GetCurrentAppVersionController {
  constructor(private useCase: GetCurrentAppVersionUseCase) {}

  @Public()
  @Get('version')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async handle() {
    const result = await this.useCase.execute()

    if (result.isLeft()) {
      throw new CustomHttpException(result.value)
    }

    return {
      success: true,
      data: MobileAppVersionPresenter.toPublicHTTP(result.value.version),
      error: null,
    }
  }
}
