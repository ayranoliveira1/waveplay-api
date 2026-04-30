import { describe, it, expect } from 'vitest'

import { MobileAppVersionPresenter } from './mobile-app-version-presenter'
import { MobileAppVersion } from '../../domain/entities/mobile-app-version'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

function makeVersion(
  overrides: Partial<{ isCurrent: boolean; publishedAt: Date }> = {},
) {
  return MobileAppVersion.create(
    {
      version: '1.0.0',
      storageKey: 'apks/1.0.0.apk',
      downloadUrl: 'https://r2/apks/1.0.0.apk',
      fileSize: 30_000_000,
      releaseNotes: 'Bug fixes',
      forceUpdate: false,
      isCurrent: overrides.isCurrent ?? false,
      publishedBy: 'admin-1',
      publishedAt: overrides.publishedAt ?? new Date('2026-04-30T12:00:00Z'),
    },
    new UniqueEntityID('v1'),
  )
}

describe('MobileAppVersionPresenter', () => {
  describe('toPublicHTTP', () => {
    it('should expose publishedAt and isCurrent in the public payload', () => {
      const version = makeVersion({
        isCurrent: true,
        publishedAt: new Date('2026-04-30T12:00:00Z'),
      })

      const result = MobileAppVersionPresenter.toPublicHTTP(version)

      expect(result.publishedAt).toEqual(new Date('2026-04-30T12:00:00Z'))
      expect(result.isCurrent).toBe(true)
    })

    it('should mark isCurrent: false when version is not the current one', () => {
      const version = makeVersion({ isCurrent: false })

      const result = MobileAppVersionPresenter.toPublicHTTP(version)

      expect(result.isCurrent).toBe(false)
    })

    it('should NOT expose internal fields (id, fileSize, publishedBy, storageKey)', () => {
      const version = makeVersion()

      const result = MobileAppVersionPresenter.toPublicHTTP(version) as Record<
        string,
        unknown
      >

      expect(result.id).toBeUndefined()
      expect(result.fileSize).toBeUndefined()
      expect(result.publishedBy).toBeUndefined()
      expect(result.storageKey).toBeUndefined()
    })

    it('should expose only the documented public fields', () => {
      const version = makeVersion()

      const result = MobileAppVersionPresenter.toPublicHTTP(version)
      const keys = Object.keys(result).sort()

      expect(keys).toEqual(
        [
          'version',
          'downloadUrl',
          'forceUpdate',
          'releaseNotes',
          'publishedAt',
          'isCurrent',
        ].sort(),
      )
    })
  })
})
