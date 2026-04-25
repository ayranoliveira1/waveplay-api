import { beforeEach, describe, expect, it } from 'vitest'

import { GenerateUploadUrlUseCase } from './generate-upload-url-use-case'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { FakeObjectStorage } from 'test/ports/fake-object-storage'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { InvalidSemverError } from '../../domain/errors/invalid-semver.error'
import { VersionAlreadyExistsError } from '../../domain/errors/version-already-exists.error'

let repo: InMemoryMobileAppVersionsRepository
let storage: FakeObjectStorage
let sut: GenerateUploadUrlUseCase

describe('GenerateUploadUrlUseCase', () => {
  beforeEach(() => {
    repo = new InMemoryMobileAppVersionsRepository()
    storage = new FakeObjectStorage()
    sut = new GenerateUploadUrlUseCase(repo, storage)
  })

  it('should generate a presigned upload URL', async () => {
    const result = await sut.execute({ version: '1.0.0' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.uploadUrl).toContain('fake-r2.test/apks/1.0.0.apk')
      expect(result.value.storageKey).toBe('apks/1.0.0.apk')
      expect(result.value.expiresAt).toBeInstanceOf(Date)
    }
    expect(storage.uploadCalls).toHaveLength(1)
    expect(storage.uploadCalls[0].contentType).toBe(
      'application/vnd.android.package-archive',
    )
  })

  it('should accept prerelease versions', async () => {
    const result = await sut.execute({ version: '1.0.0-beta.1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.storageKey).toBe('apks/1.0.0-beta.1.apk')
    }
  })

  it('should reject invalid semver', async () => {
    const result = await sut.execute({ version: 'not-semver' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSemverError)
  })

  it('should reject duplicate version', async () => {
    repo.items.push(
      MobileAppVersion.create(
        {
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          downloadUrl: 'url',
          fileSize: 1000,
          publishedBy: 'admin-1',
        },
        new UniqueEntityID('v1'),
      ),
    )

    const result = await sut.execute({ version: '1.0.0' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(VersionAlreadyExistsError)
  })
})
