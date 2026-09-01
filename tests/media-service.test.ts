import { describe, it, expect } from 'vitest';
import {
  createPresignedUploadAction,
  registerMediaAssetAction,
  getPrivateDownloadUrlAction,
  deleteMediaAssetAction,
  getStoreMediaAssetsAction,
} from '@/app/actions/media';

describe('Media Server Actions & Service Boundaries', () => {
  it('returns VALIDATION_ERROR on invalid presigned upload payload', async () => {
    const res = await createPresignedUploadAction({
      storeId: 'invalid-uuid',
      filename: '',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects public upload request for PDF in action', async () => {
    const res = await createPresignedUploadAction({
      storeId: '11111111-1111-4111-8111-111111111111',
      filename: 'invoice.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      visibility: 'PUBLIC',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns VALIDATION_ERROR on invalid asset registration payload', async () => {
    const res = await registerMediaAssetAction({
      storeId: 'invalid-uuid',
      storageKey: '',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns VALIDATION_ERROR on path traversal registration attempt', async () => {
    const res = await registerMediaAssetAction({
      storeId: '11111111-1111-4111-8111-111111111111',
      storageKey: 'stores/11111111-1111-4111-8111-111111111111/public/../../secret.txt',
      filename: 'secret.txt',
      mimeType: 'image/png',
      fileSizeBytes: 100,
      visibility: 'PUBLIC',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns VALIDATION_ERROR on invalid getPrivateDownloadUrl payload', async () => {
    const res = await getPrivateDownloadUrlAction({
      storeId: 'invalid',
      assetId: 'invalid',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns VALIDATION_ERROR on invalid deleteMediaAsset payload', async () => {
    const res = await deleteMediaAssetAction({
      storeId: 'invalid',
      assetId: 'invalid',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns VALIDATION_ERROR on invalid getStoreMediaAssets payload', async () => {
    const res = await getStoreMediaAssetsAction({
      storeId: 'invalid',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
