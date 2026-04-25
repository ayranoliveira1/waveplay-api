import { beforeEach, describe, expect, it } from 'vitest'

import { GetCurrentAppVersionUseCase } from './get-current-app-version-use-case'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { NoCurrentVersionError } from '../../domain/errors/no-current-version.error'

let repo: InMemoryMobileAppVersionsRepository
let sut: GetCurrentAppVersionUseCase

describe('GetCurrentAppVersionUseCase', () => {
  beforeEach(() => {
    repo = new InMemoryMobileAppVersionsRepository()
    sut = new GetCurrentAppVersionUseCase(repo)
  })

  it('should return the current version', async () => {
    repo.items.push(
      MobileAppVersion.create(
        {
          version: '1.0.0',
          storageKey: 'apks/1.0.0.apk',
          downloadUrl: 'https://fake-r2.test/apks/1.0.0.apk',
          fileSize: 30_000_000,
          publishedBy: 'admin-1',
          isCurrent: true,
        },
        new UniqueEntityID('v1'),
      ),
    )

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.version.version).toBe('1.0.0')
    }
  })

  it('should return NoCurrentVersionError when there is no current version', async () => {
    const result = await sut.execute()

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NoCurrentVersionError)
  })
})
