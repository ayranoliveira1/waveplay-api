import { left, right, type Either } from '@/core/either'
import { VersionNotFoundError } from '../../domain/errors/version-not-found.error'
import type { InvalidSemverError } from '../../domain/errors/invalid-semver.error'
import type { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { Injectable, Logger } from '@nestjs/common'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'

interface SetCurrentAppVersionRequest {
  versionId: string
}

type SetCurrentAppVersionResponse = Either<
  InvalidSemverError | VersionNotFoundError,
  { version: MobileAppVersion }
>

@Injectable()
export class SetCurrentAppVersionUseCase {
  private readonly logger = new Logger(SetCurrentAppVersionUseCase.name)

  constructor(
    private readonly mobileAppVersionRepository: MobileAppVersionsRepository,
  ) {}

  async execute({
    versionId,
  }: SetCurrentAppVersionRequest): Promise<SetCurrentAppVersionResponse> {
    const version = await this.mobileAppVersionRepository.findById(versionId)

    if (!version) {
      return left(new VersionNotFoundError())
    }

    await this.mobileAppVersionRepository.setCurrent(versionId)
    version.markAsCurrent()

    this.logger.log(`Admin promoted version to current: ${version.version}`)

    return right({ version })
  }
}
