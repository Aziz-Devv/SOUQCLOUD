import { revalidateTag, revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export interface CloudflarePurgeResult {
  success: boolean;
  purged: boolean;
  reason?: string;
  error?: string;
}

/**
 * Dispatches multi-tier cache invalidation across Next.js and Cloudflare edge CDN.
 */
export async function revalidateStoreCache(
  storeId: string,
  pageId?: string
): Promise<{ nextCacheRevalidated: boolean; cloudflareResult: CloudflarePurgeResult }> {
  const tags = [`store_${storeId}`];
  if (pageId) {
    tags.push(`page_${pageId}`);
  }

  // 1. Next.js Data Cache Revalidation
  try {
    revalidateTag(`store_${storeId}`, 'max');
    if (pageId) {
      revalidateTag(`page_${pageId}`, 'max');
    }
    revalidatePath('/');
  } catch (error) {
    logger.warn('Next.js cache revalidation warning', {
      storeId,
      pageId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 2. Cloudflare Edge CDN Purge
  const cloudflareResult = await purgeCloudflareEdgeCache(tags);

  return {
    nextCacheRevalidated: true,
    cloudflareResult,
  };
}

/**
 * Dispatches an edge cache purge request to Cloudflare Purge Cache API using Cache-Tags.
 * Gracefully falls back in local/development environments when credentials are not configured.
 */
export async function purgeCloudflareEdgeCache(
  tags: string[]
): Promise<CloudflarePurgeResult> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_PURGE_API_TOKEN;

  if (!zoneId || !apiToken) {
    logger.info('Cloudflare edge purge skipped: credentials not configured in environment', {
      tags,
    });
    return {
      success: true,
      purged: false,
      reason: 'unconfigured_in_environment',
    };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('Cloudflare edge cache purge returned non-OK status', {
        status: response.status,
        response: errorText,
        tags,
      });
      return {
        success: false,
        purged: false,
        error: `Cloudflare API returned ${response.status}`,
      };
    }

    logger.info('Cloudflare edge cache purged successfully', { tags });
    return {
      success: true,
      purged: true,
    };
  } catch (error) {
    logger.warn('Cloudflare edge cache purge request failed', {
      tags,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      purged: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
}

/**
 * Builds the Cache-Tag header string according to the documented format:
 * store_<storeId>, page_<pageId>, theme_<themeId>
 */
export function buildCacheTagHeader(
  storeId: string,
  pageId?: string | null,
  themeId?: string | null
): string {
  const tags = [`store_${storeId}`];
  if (pageId) {
    tags.push(`page_${pageId}`);
  }
  if (themeId) {
    tags.push(`theme_${themeId}`);
  }
  return tags.join(', ');
}
