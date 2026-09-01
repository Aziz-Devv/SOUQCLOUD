import { describe, it, expect } from 'vitest';
import {
  PublishStoreSchema,
  UnpublishStoreSchema,
  UpdateStoreStatusSchema,
  PublishPageSchema,
} from '../src/lib/schemas/publishing';
import { purgeCloudflareEdgeCache } from '../src/lib/publishing/cache-invalidation';

describe('Publishing: Schemas & Cache Invalidation Engine', () => {
  describe('Validation Schemas', () => {
    it('validates a valid PublishStore input payload', () => {
      const result = PublishStoreSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid storeId in PublishStore payload', () => {
      const result = PublishStoreSchema.safeParse({
        storeId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('validates a valid UnpublishStore input payload', () => {
      const result = UnpublishStoreSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
      });
      expect(result.success).toBe(true);
    });

    it('validates all allowed store statuses in UpdateStoreStatus', () => {
      const statuses = ['DRAFT', 'PUBLISHED', 'MAINTENANCE', 'ARCHIVED'] as const;
      for (const status of statuses) {
        const result = UpdateStoreStatusSchema.safeParse({
          storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects unsupported store status in UpdateStoreStatus', () => {
      const result = UpdateStoreStatusSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        status: 'NON_EXISTENT_STATUS',
      });
      expect(result.success).toBe(false);
    });

    it('validates a valid PublishPage payload', () => {
      const result = PublishPageSchema.safeParse({
        pageId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Cloudflare Edge Cache Purge Fallback', () => {
    it('gracefully skips edge purge when credentials are not configured in environment', async () => {
      const originalZone = process.env.CLOUDFLARE_ZONE_ID;
      const originalToken = process.env.CLOUDFLARE_PURGE_API_TOKEN;

      delete process.env.CLOUDFLARE_ZONE_ID;
      delete process.env.CLOUDFLARE_PURGE_API_TOKEN;

      const result = await purgeCloudflareEdgeCache(['store_38a0f664-ae7f-4d0b-bd85-cce200541807']);

      expect(result.success).toBe(true);
      expect(result.purged).toBe(false);
      expect(result.reason).toBe('unconfigured_in_environment');

      process.env.CLOUDFLARE_ZONE_ID = originalZone;
      process.env.CLOUDFLARE_PURGE_API_TOKEN = originalToken;
    });
  });
});
