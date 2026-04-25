import { left, right, type Either } from '@/core/either'
import { NoCurrentVersionError } from '../../domain/errors/no-current-version.error'
import type { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { Injectable } from '@nestjs/common'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'

type GetCurrentAppVersionResponse = Either<
  NoCurrentVersionError,
  { version: MobileAppVersion }
>

@Injectable()
export class GetCurrentAppVersionUseCase {
  constructor(
    private readonly mobileAppVersionsRepository: MobileAppVersionsRepository,
  ) {}

  async execute(): Promise<GetCurrentAppVersionResponse> {
    const version = await this.mobileAppVersionsRepository.findCurrent()

    if (!version) {
      return left(new NoCurrentVersionError())
    }

    return right({ version })
  }
}
