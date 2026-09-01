import { CustomHostnameAdapter } from './types';
import { CloudflareCustomHostnameClient } from './cloudflare-adapter';
import { MockCustomHostnameAdapter } from './mock-adapter';
import { logger } from '@/lib/logger';

let customHostnameAdapterInstance: CustomHostnameAdapter | null = null;

/**
 * Returns the configured CustomHostnameAdapter instance.
 * Automatically falls back to MockCustomHostnameAdapter in test/development environments
 * or when Cloudflare API credentials are not provided.
 */
export function getCustomHostnameAdapter(): CustomHostnameAdapter {
  if (customHostnameAdapterInstance) {
    return customHostnameAdapterInstance;
  }

  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (process.env.NODE_ENV === 'test' || !zoneId || !apiToken) {
    logger.info('Using MockCustomHostnameAdapter for custom domain operations');
    customHostnameAdapterInstance = new MockCustomHostnameAdapter();
  } else {
    logger.info('Using CloudflareCustomHostnameClient for custom domain operations');
    customHostnameAdapterInstance = new CloudflareCustomHostnameClient({
      zoneId,
      apiToken,
      fallbackOrigin: process.env.CLOUDFLARE_FALLBACK_ORIGIN || 'cname.souqcloud.com',
    });
  }

  return customHostnameAdapterInstance;
}

/**
 * Overrides the active adapter instance (primarily for automated testing).
 */
export function setCustomHostnameAdapter(adapter: CustomHostnameAdapter | null) {
  customHostnameAdapterInstance = adapter;
}
