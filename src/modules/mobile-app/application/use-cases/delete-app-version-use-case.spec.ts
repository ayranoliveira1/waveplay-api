import { beforeEach, describe, expect, it } from 'vitest'

import { DeleteAppVersionUseCase } from './delete-app-version-use-case'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { FakeObjectStorage } from 'test/ports/fake-object-storage'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { VersionNotFoundError } from '../../domain/errors/version-not-found.error'
import { CannotDeleteCurrentVersionError } from '../../domain/errors/cannot-delete-current-version.error'

let repo: InMemoryMobileAppVersionsRepository
let storage: FakeObjectStorage
let sut: DeleteAppVersionUseCase

describe('DeleteAppVersionUseCase', () => {
  beforeEach(() => {
    repo = new InMemoryMobileAppVersionsRepository()
    storage = new FakeObjectStorage()
    sut = new DeleteAppVersionUseCase(repo, storage)
  })

  it('should delete a non-current version and call storage.delete', async () => {
    repo.items.push(
      MobileAppVersion.create(
        {
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          downloadUrl: 'u',
          fileSize: 1000,
          publishedBy: 'admin-1',
          isCurrent: false,
        },
        new UniqueEntityID('v1'),
      ),
    )

    const result = await sut.execute({ versionId: 'v1' })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(0)
    expect(storage.deletedKeys).toContain('apks/1.0.0.apk')
  })

  it('should return VersionNotFoundError when id does not exist', async () => {
    const result = await sut.execute({ versionId: 'nonexistent' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(VersionNotFoundError)
  })

  it('should return CannotDeleteCurrentVersionError when version is current', async () => {
    repo.items.push(
      MobileAppVersion.create(
        {
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          downloadUrl: 'u',
          fileSize: 1000,
          publishedBy: 'admin-1',
          isCurrent: true,
        },
        new UniqueEntityID('v1'),
      ),
    )

    const result = await sut.execute({ versionId: 'v1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CannotDeleteCurrentVersionError)
    expect(repo.items).toHaveLength(1)
    expect(storage.deletedKeys).toHaveLength(0)
  })
})
