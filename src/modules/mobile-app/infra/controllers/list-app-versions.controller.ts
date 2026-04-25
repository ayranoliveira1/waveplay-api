import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'

import { ListAppVersionsUseCase } from '../../application/use-cases/list-app-versions-use-case'
import { MobileAppVersionPresenter } from '../presenters/mobile-app-version-presenter'
import { Admin } from '@/modules/admin/infra/decorators/admin.decorator'

@Controller('/admin')
export class ListAppVersionsController {
  constructor(private useCase: ListAppVersionsUseCase) {}

  @Get('app-versions')
  @Admin()
  @HttpCode(HttpStatus.OK)
  async handle() {
    const result = await this.useCase.execute()

    return {
      success: true,
      data: {
        versions: result.value.versions.map(
          MobileAppVersionPresenter.toAdminHTTP,
        ),
      },
      error: null,
    }
  }
}
