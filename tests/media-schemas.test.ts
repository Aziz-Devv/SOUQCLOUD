import { describe, it, expect } from 'vitest';
import {
  CreatePresignedUploadSchema,
  RegisterMediaAssetSchema,
  MAX_MEDIA_FILE_SIZE_BYTES,
} from '@/lib/schemas/media';

describe('Media Schemas & Validation Rules', () => {
  const validStoreId = '11111111-1111-4111-8111-111111111111';

  describe('CreatePresignedUploadSchema', () => {
    it('accepts valid public image upload requests', () => {
      const input = {
        storeId: validStoreId,
        filename: 'hero-banner.webp',
        mimeType: 'image/webp',
        fileSize: 1024 * 500, // 500 KB
        visibility: 'PUBLIC' as const,
      };

      const result = CreatePresignedUploadSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts valid private PDF upload requests', () => {
      const input = {
        storeId: validStoreId,
        filename: 'tax_invoice_2026.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 200, // 200 KB
        visibility: 'PRIVATE' as const,
      };

      const result = CreatePresignedUploadSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('strictly rejects PDF with PUBLIC visibility', () => {
      const input = {
        storeId: validStoreId,
        filename: 'invoice.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024 * 100,
        visibility: 'PUBLIC' as const,
      };

      const result = CreatePresignedUploadSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('PRIVATE');
      }
    });

    it('rejects unsupported MIME types (e.g., text/html, application/javascript)', () => {
      const input = {
        storeId: validStoreId,
        filename: 'malicious.js',
        mimeType: 'application/javascript',
        fileSize: 1024,
        visibility: 'PUBLIC' as const,
      };

      const result = CreatePresignedUploadSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects files exceeding 15 MB max size', () => {
      const input = {
        storeId: validStoreId,
        filename: 'giant-photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: MAX_MEDIA_FILE_SIZE_BYTES + 1,
        visibility: 'PUBLIC' as const,
      };

      const result = CreatePresignedUploadSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('15 ميجابايت');
      }
    });

    it('rejects invalid storeId', () => {
      const input = {
        storeId: 'invalid-not-uuid',
        filename: 'image.png',
        mimeType: 'image/png',
        fileSize: 1024,
        visibility: 'PUBLIC' as const,
      };

      const result = CreatePresignedUploadSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('RegisterMediaAssetSchema', () => {
    it('accepts valid registration with matching public key prefix', () => {
      const input = {
        storeId: validStoreId,
        storageKey: `stores/${validStoreId}/public/uuid-1234-photo.jpg`,
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 2048,
        visibility: 'PUBLIC' as const,
        width: 1920,
        height: 1080,
      };

      const result = RegisterMediaAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects registration if storageKey does not match storeId', () => {
      const otherStoreId = '22222222-2222-4222-8222-222222222222';
      const input = {
        storeId: validStoreId,
        storageKey: `stores/${otherStoreId}/public/uuid-1234-photo.jpg`,
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 2048,
        visibility: 'PUBLIC' as const,
      };

      const result = RegisterMediaAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects registration with path traversal attempt', () => {
      const input = {
        storeId: validStoreId,
        storageKey: `stores/${validStoreId}/public/../../../etc/passwd`,
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 2048,
        visibility: 'PUBLIC' as const,
      };

      const result = RegisterMediaAssetSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
