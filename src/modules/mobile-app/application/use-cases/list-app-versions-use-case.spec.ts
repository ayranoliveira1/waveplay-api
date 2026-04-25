import { beforeEach, describe, expect, it } from 'vitest'

import { ListAppVersionsUseCase } from './list-app-versions-use-case'
import { InMemoryMobileAppVersionsRepository } from 'test/repositories/in-memory-mobile-app-versions-repository'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

let repo: InMemoryMobileAppVersionsRepository
let sut: ListAppVersionsUseCase

describe('ListAppVersionsUseCase', () => {
  beforeEach(() => {
    repo = new InMemoryMobileAppVersionsRepository()
    sut = new ListAppVersionsUseCase(repo)
  })

  it('should return empty list when there are no versions', async () => {
    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.versions).toHaveLength(0)
    }
  })

  it('should return versions sorted by publishedAt desc', async () => {
    const older = MobileAppVersion.create(
      {
        version: '1.0.0',
        storageKey: 'apks/1.0.0.apk',
        downloadUrl: 'url1',
        fileSize: 1000,
        publishedBy: 'admin-1',
        publishedAt: new Date('2026-01-01'),
      },
      new UniqueEntityID('v1'),
    )
    const newer = MobileAppVersion.create(
      {
        version: '1.0.1',
        storageKey: 'apks/1.0.1.apk',
        downloadUrl: 'url2',
        fileSize: 2000,
        publishedBy: 'admin-1',
        publishedAt: new Date('2026-02-01'),
      },
      new UniqueEntityID('v2'),
    )

    repo.items.push(older, newer)

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.versions[0].version).toBe('1.0.1')
      expect(result.value.versions[1].version).toBe('1.0.0')
    }
  })
})
