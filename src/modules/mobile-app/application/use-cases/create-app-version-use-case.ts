import { left, right, type Either } from '@/core/either'
import { InvalidSemverError } from '../../domain/errors/invalid-semver.error'
import { VersionAlreadyExistsError } from '../../domain/errors/version-already-exists.error'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { Injectable, Logger } from '@nestjs/common'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'
import { ObjectStoragePort } from '../ports/object-storage.port'
import { isValidSemver } from '../../domain/semver'

interface CreateAppVersionRequest {
  version: string
  storageKey: string
  fileSize: number
  releaseNotes?: string
  forceUpdate?: boolean
  publishedBy: string
}

type CreateAppVersionResponse = Either<
  InvalidSemverError | VersionAlreadyExistsError,
  { version: MobileAppVersion }
>

@Injectable()
export class CreateAppVersionUseCase {
  private readonly logger = new Logger(CreateAppVersionUseCase.name)

  constructor(
    private readonly mobileAppVersionsRepository: MobileAppVersionsRepository,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute(
    request: CreateAppVersionRequest,
  ): Promise<CreateAppVersionResponse> {
    const {
      version,
      storageKey,
      fileSize,
      releaseNotes,
      forceUpdate,
      publishedBy,
    } = request

    if (!isValidSemver(version)) {
      return left(new InvalidSemverError())
    }

    const existingVersion =
      await this.mobileAppVersionsRepository.findByVersion(version)

    if (existingVersion) {
      return left(new VersionAlreadyExistsError(version))
    }

    const downloadUrl = this.objectStorage.publicUrl(storageKey)

    const newVersion = MobileAppVersion.create({
      version,
      storageKey,
      downloadUrl,
      fileSize,
      releaseNotes,
      forceUpdate,
      publishedBy,
    })

    await this.mobileAppVersionsRepository.create(newVersion)

    this.logger.log(
      `Admin published mobile app version: ${request.version} by ${request.publishedBy}`,
    )

    return right({ version: newVersion })
  }
}
