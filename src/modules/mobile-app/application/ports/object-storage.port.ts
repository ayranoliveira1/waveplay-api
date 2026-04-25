export abstract class ObjectStoragePort {
  abstract generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<string>

  abstract delete(key: string): Promise<void>

  abstract publicUrl(key: string): string
}
