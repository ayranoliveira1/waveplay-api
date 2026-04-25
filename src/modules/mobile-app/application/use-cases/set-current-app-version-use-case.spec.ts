import { beforeEach, describe, expect, it } from 'vitest'

import { SetCurrentAppVersionUseCase } from './set-current-app-version-use-case'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { VersionNotFoundError } from '../../domain/errors/version-not-found.error'

let repo: InMemoryMobileAppVersionsRepository
let sut: SetCurrentAppVersionUseCase

describe('SetCurrentAppVersionUseCase', () => {
  beforeEach(() => {
    repo = new InMemoryMobileAppVersionsRepository()
    sut = new SetCurrentAppVersionUseCase(repo)
  })

  it('should promote a version and unmark all others', async () => {
    repo.items.push(
      MobileAppVersion.create(
        {
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          downloadUrl: 'u1',
          fileSize: 1,
          publishedBy: 'admin-1',
          isCurrent: true,
        },
        new UniqueEntityID('v1'),
      ),
      MobileAppVersion.create(
        {
          version: '1.0.1',
          storageKey: 'apks/1.0.1.apk',
          downloadUrl: 'u2',
          fileSize: 1,
          publishedBy: 'admin-1',
          isCurrent: false,
        },
        new UniqueEntityID('v2'),
      ),
    )

    const result = await sut.execute({ versionId: 'v2' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.version.isCurrent).toBe(true)
    }

    const v1 = await repo.findById('v1')
    expect(v1?.isCurrent).toBe(false)
  })

  it('should return VersionNotFoundError when id does not exist', async () => {
    const result = await sut.execute({ versionId: 'nonexistent' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(VersionNotFoundError)
  })
})
