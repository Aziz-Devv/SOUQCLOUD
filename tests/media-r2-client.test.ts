import { describe, it, expect } from 'vitest';
import {
  buildStorageKey,
  buildPublicCdnUrl,
  generateR2PresignedUploadUrl,
  generateR2PresignedDownloadUrl,
} from '@/lib/media/r2-client';

describe('Cloudflare R2 Client & Storage Key Helpers', () => {
  const storeId = '88888888-8888-4888-8888-888888888888';
  const uuid = 'aaaa-bbbb-cccc';

  it('builds canonical storage key for PUBLIC assets with sanitized filename', () => {
    const key = buildStorageKey(storeId, 'PUBLIC', uuid, 'my product photo #1 (final).png');
    expect(key).toBe(`stores/${storeId}/public/aaaa-bbbb-cccc-my_product_photo_1_final_.png`);
  });

  it('builds canonical storage key for PRIVATE assets', () => {
    const key = buildStorageKey(storeId, 'PRIVATE', uuid, 'march_tax_invoice.pdf');
    expect(key).toBe(`stores/${storeId}/private/aaaa-bbbb-cccc-march_tax_invoice.pdf`);
  });

  it('computes public CDN URL correctly', () => {
    const storageKey = `stores/${storeId}/public/aaaa-bbbb-cccc-hero.webp`;
    const cdnUrl = buildPublicCdnUrl(storageKey);
    expect(cdnUrl).toBe(`https://cdn.souqcloud.com/stores/${storeId}/public/aaaa-bbbb-cccc-hero.webp`);
  });

  it('generates presigned upload URL with 15-minute expiration', async () => {
    const storageKey = `stores/${storeId}/public/aaaa-bbbb-cccc-image.png`;
    const url = await generateR2PresignedUploadUrl(storageKey, 'image/png', 900);
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
  });

  it('generates presigned download URL for private assets', async () => {
    const storageKey = `stores/${storeId}/private/aaaa-bbbb-cccc-doc.pdf`;
    const url = await generateR2PresignedDownloadUrl(storageKey, 900);
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
  });
});
