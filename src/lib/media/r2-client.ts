import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { MediaVisibility } from './types';

let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (s3ClientInstance) return s3ClientInstance;

  const env = getServerEnv();
  const accountId = env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  s3ClientInstance = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

export function getR2BucketName(): string {
  const env = getServerEnv();
  return env.CLOUDFLARE_R2_BUCKET_NAME || 'souqcloud-media';
}

export function getCdnBaseUrl(): string {
  return process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.souqcloud.com';
}

/**
 * Constructs the canonical tenant-isolated storage key.
 * Public:  stores/<storeId>/public/<uuid>-<sanitized_filename>
 * Private: stores/<storeId>/private/<uuid>-<sanitized_filename>
 */
export function buildStorageKey(
  storeId: string,
  visibility: MediaVisibility,
  uuid: string,
  filename: string
): string {
  const sanitizedFilename = filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  const scope = visibility === 'PUBLIC' ? 'public' : 'private';
  return `stores/${storeId}/${scope}/${uuid}-${sanitizedFilename}`;
}

/**
 * Computes the public CDN URL for a given storage key if visibility is PUBLIC.
 */
export function buildPublicCdnUrl(storageKey: string): string {
  const cdnBase = getCdnBaseUrl().replace(/\/+$/, '');
  const cleanKey = storageKey.replace(/^\/+/, '');
  return `${cdnBase}/${cleanKey}`;
}

/**
 * Generates an S3 PutObject presigned URL (15 minutes expiry) for direct browser-to-R2 upload.
 */
export async function generateR2PresignedUploadUrl(
  storageKey: string,
  mimeType: string,
  expiresInSeconds: number = 900
): Promise<string> {
  const client = getR2Client();
  const bucket = getR2BucketName();

  if (!client) {
    logger.info('Cloudflare R2 credentials not configured, generating mock presigned upload URL', {
      storageKey,
    });
    return `https://mock-r2.souqcloud.local/${bucket}/${storageKey}?mock_signed=true&expires=${expiresInSeconds}`;
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: mimeType,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generates an S3 GetObject presigned URL (15 minutes expiry) for authenticated private media download.
 */
export async function generateR2PresignedDownloadUrl(
  storageKey: string,
  expiresInSeconds: number = 900
): Promise<string> {
  const client = getR2Client();
  const bucket = getR2BucketName();

  if (!client) {
    logger.info('Cloudflare R2 credentials not configured, generating mock presigned download URL', {
      storageKey,
    });
    return `https://mock-r2.souqcloud.local/${bucket}/${storageKey}?mock_download=true&expires=${expiresInSeconds}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: storageKey,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes a binary object from Cloudflare R2 bucket.
 */
export async function deleteR2Object(storageKey: string): Promise<void> {
  const client = getR2Client();
  const bucket = getR2BucketName();

  if (!client) {
    logger.info('Cloudflare R2 credentials not configured, skipping physical object deletion', {
      storageKey,
    });
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    });
    await client.send(command);
  } catch (err) {
    logger.error('Failed to delete object from Cloudflare R2', {
      storageKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
