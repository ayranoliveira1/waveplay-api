import { Injectable } from '@nestjs/common'
import { ObjectStoragePort } from '../../application/ports/object-storage.port'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { EnvService } from '@/shared/env/env.service'

@Injectable()
export class R2ObjectStorage extends ObjectStoragePort {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly publicBaseUrl: string

  constructor(private envService: EnvService) {
    super()

    const accontId = this.envService.get('R2_ACCOUNT_ID')
    const accessKeyId = this.envService.get('R2_ACCESS_KEY_ID')
    const secretAccessKey = this.envService.get('R2_SECRET_ACCESS_KEY')

    this.bucket = this.envService.get('R2_BUCKET')
    this.publicBaseUrl = this.envService.get('R2_PUBLIC_URL')

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accontId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    })

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds })
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })
    await this.client.send(command)
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`
  }
}
