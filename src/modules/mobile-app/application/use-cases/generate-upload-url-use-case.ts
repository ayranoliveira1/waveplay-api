import { Either, left, right } from '@/core/either'
import { InvalidSemverError } from '../../domain/errors/invalid-semver.error'
import { VersionAlreadyExistsError } from '../../domain/errors/version-already-exists.error'
import { Injectable } from '@nestjs/common'
import { MobileAppVersionsRepository } from '../../domain/repositories/mobile-app-versions-repository'
import { ObjectStoragePort } from '../ports/object-storage.port'
import { isValidSemver } from '../../domain/semver'

const PRESIGNED_EXPIRES_IN = 300
const APK_CONTENT_TYPE = 'application/vnd.android.package-archive'

interface GenerateUploadUrlRequest {
  version: string
}

type GenerateUploadUrlResponse = Either<
  InvalidSemverError | VersionAlreadyExistsError,
  { uploadUrl: string; storageKey: string; expiresAt: Date }
>

@Injectable()
export class GenerateUploadUrlUseCase {
  constructor(
    private readonly mobileAppversionsRepository: MobileAppVersionsRepository,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute({
    version,
  }: GenerateUploadUrlRequest): Promise<GenerateUploadUrlResponse> {
    if (!isValidSemver(version)) {
      return left(new InvalidSemverError())
    }

    const existingversion =
      await this.mobileAppversionsRepository.findByVersion(version)

    if (existingversion) {
      return left(new VersionAlreadyExistsError(version))
    }

    const storageKey = `apks/${version}.apk`
    const uploadUrl = await this.objectStorage.generatePresignedUploadUrl(
      storageKey,
      APK_CONTENT_TYPE,
      PRESIGNED_EXPIRES_IN,
    )

    const expiresAt = new Date(Date.now() + PRESIGNED_EXPIRES_IN * 1000)

    return right({ uploadUrl, storageKey, expiresAt })
  }
}
