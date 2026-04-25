import { left, right, type Either } from '@/core/either'
import { CannotDeleteCurrentVersionError } from '../../domain/errors/cannot-delete-current-version.error'
import { VersionNotFoundError } from '../../domain/errors/version-not-found.error'
import { Injectable, Logger } from '@nestjs/common'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'
import { ObjectStoragePort } from '../ports/object-storage.port'

interface DeleteAppVersionRequest {
  versionId: string
}

type DeleteAppVersionResponse = Either<
  VersionNotFoundError | CannotDeleteCurrentVersionError,
  { deleted: true }
>

@Injectable()
export class DeleteAppVersionUseCase {
  private readonly logger = new Logger(DeleteAppVersionUseCase.name)

  constructor(
    private readonly mobileAppVersionRepository: MobileAppVersionsRepository,

    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute({
    versionId,
  }: DeleteAppVersionRequest): Promise<DeleteAppVersionResponse> {
    const version = await this.mobileAppVersionRepository.findById(versionId)

    if (!version) {
      return left(new VersionNotFoundError())
    }

    if (version.isCurrent) {
      return left(new CannotDeleteCurrentVersionError())
    }

    try {
      await this.objectStorage.delete(version.storageKey)
    } catch (error) {
      this.logger.warn(
        `Failed to delete object from storage (${version.storageKey}): ${(error as Error).message}`,
      )
    }

    await this.mobileAppVersionRepository.delete(versionId)

    this.logger.log(`Admin hard-deleted mobile app version: ${version.version}`)

    return right({ deleted: true })
  }
}
