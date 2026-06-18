import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { AppConfig } from '../config/app.config';

export interface UploadResult {
  r2Key: string;
  publicUrl: string;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService<{ app: AppConfig }, true>) {
    const storage = config.get('app.storage', { infer: true });
    this.bucket = storage.bucket;
    this.publicBaseUrl = storage.publicBaseUrl.replace(/\/$/, '');

    this.client = new S3Client({
      endpoint: storage.endpoint,
      region: 'auto',
      credentials: {
        accessKeyId: storage.accessKeyId,
        secretAccessKey: storage.secretAccessKey,
      },
      forcePathStyle: false,
    });
  }

  /**
   * Upload a file buffer to the given folder and return its key + public URL.
   * The r2Key is generated as `folder/uuid.ext`.
   */
  async uploadFile(
    folder: string,
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    const ext = file.originalname.includes('.')
      ? file.originalname.split('.').pop()
      : undefined;
    const r2Key = `${folder}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: r2Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { r2Key, publicUrl: this.getPublicUrl(r2Key) };
  }

  async deleteObject(r2Key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: r2Key }),
    );
  }

  getPublicUrl(r2Key: string): string {
    return `${this.publicBaseUrl}/${r2Key}`;
  }

  /**
   * Inverse of {@link getPublicUrl}: recover the r2Key from a public URL so the
   * object can be deleted. Returns null when the URL is not served from this
   * bucket's public base URL (e.g. a legacy or external image).
   */
  keyFromPublicUrl(url: string): string | null {
    const prefix = `${this.publicBaseUrl}/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
  }
}
