import { ObjectStoragePort } from '@/modules/mobile-app/application/ports/object-storage.port'

export class FakeObjectStorage extends ObjectStoragePort {
  public deletedKeys: string[] = []
  public uploadCalls: Array<{
    key: string
    contentType: string
    expiresInSeconds: number
  }> = []

  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<string> {
    this.uploadCalls.push({ key, contentType, expiresInSeconds })
    return `https://fake-r2.test/${key}?signed=1&expires=${expiresInSeconds}`
  }

  async delete(key: string): Promise<void> {
    this.deletedKeys.push(key)
  }

  publicUrl(key: string): string {
    return `https://fake-r2.test/${key}`
  }
}
