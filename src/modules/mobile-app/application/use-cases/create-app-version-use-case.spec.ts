import { beforeEach, describe, expect, it } from 'vitest'

import { CreateAppVersionUseCase } from './create-app-version-use-case'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { FakeObjectStorage } from 'test/ports/fake-object-storage'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { InvalidSemverError } from '../../domain/errors/invalid-semver.error'
import { VersionAlreadyExistsError } from '../../domain/errors/version-already-exists.error'

let repo: InMemoryMobileAppVersionsRepository
let storage: FakeObjectStorage
let sut: CreateAppVersionUseCase

describe('CreateAppVersionUseCase', () => {
  beforeEach(() => {
    repo = new InMemoryMobileAppVersionsRepository()
    storage = new FakeObjectStorage()
    sut = new CreateAppVersionUseCase(repo, storage)
  })

  it('should create a new version with default flags', async () => {
    const result = await sut.execute({
      version: '1.0.0',
      storageKey: 'apks/1.0.0.apk',
      fileSize: 30_000_000,
      publishedBy: 'admin-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.version.version).toBe('1.0.0')
      expect(result.value.version.forceUpdate).toBe(false)
      expect(result.value.version.isCurrent).toBe(false)
      expect(result.value.version.downloadUrl).toBe(
        'https://fake-r2.test/apks/1.0.0.apk',
      )
    }
    expect(repo.items).toHaveLength(1)
  })

  it('should accept releaseNotes and forceUpdate flags', async () => {
    const result = await sut.execute({
      version: '1.0.1',
      storageKey: 'apks/1.0.1.apk',
      fileSize: 31_000_000,
      releaseNotes: 'Bug fixes',
      forceUpdate: true,
      publishedBy: 'admin-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.version.releaseNotes).toBe('Bug fixes')
      expect(result.value.version.forceUpdate).toBe(true)
    }
  })

  it('should reject invalid semver', async () => {
    const result = await sut.execute({
      version: '1.0',
      storageKey: 'apks/1.0.apk',
      fileSize: 1000,
      publishedBy: 'admin-1',
    })

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

    const result = await sut.execute({
      version: '1.0.0',
      storageKey: 'apks/1.0.0.apk',
      fileSize: 1000,
      publishedBy: 'admin-1',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(VersionAlreadyExistsError)
  })
})
