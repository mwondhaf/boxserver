import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/app.config';

export interface PresignedUploadResult {
  uploadUrl: string;
  r2Key: string;
  publicUrl: string;
}

@Injectable()
export class StorageService {
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(config: ConfigService<{ app: AppConfig }, true>) {
    const storage = config.get('app.storage', { infer: true });
    this.endpoint = storage.endpoint;
    this.bucket = storage.bucket;
    this.accessKeyId = storage.accessKeyId;
    this.secretAccessKey = storage.secretAccessKey;
  }

  async getPresignedUploadUrl(
    folder: string,
    fileName: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<PresignedUploadResult> {
    const r2Key = `${folder}/${crypto.randomUUID()}-${fileName}`;
    // In production use @aws-sdk/s3-request-presigner; placeholder for now.
    const uploadUrl = `${this.endpoint}/${this.bucket}/${r2Key}?presigned=1&expires=${expiresIn}`;
    const publicUrl = `${this.endpoint}/${this.bucket}/${r2Key}`;
    return { uploadUrl, r2Key, publicUrl };
  }

  getPublicUrl(r2Key: string): string {
    return `${this.endpoint}/${this.bucket}/${r2Key}`;
  }
}
