import { createClient } from '@/lib/supabase/server';
import {
  InternalError,
  NotFoundError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { StoreStatus } from '@/lib/types';
import { revalidateStoreCache } from '@/lib/publishing/cache-invalidation';
import { publishPageSections } from '@/lib/services/page-service';

/**
 * Publishes a store, making it live and accessible to public shoppers.
 */
export async function publishStore(
  storeId: string
): Promise<{ status: StoreStatus; liveUrl: string }> {
  const supabase = await createClient();

  // 1. Verify store exists and caller is authorized
  const { data: store, error: fetchError } = await supabase
    .from('stores')
    .select('id, handle, custom_domain, status')
    .eq('id', storeId)
    .single();

  if (fetchError || !store) {
    logger.error('Failed to fetch store for publication', { storeId, error: fetchError?.message });
    throw new NotFoundError('المتجر غير موجود أو غير مصرح لك بالوصول إليه.');
  }

  // 2. Update store status to PUBLISHED
  const { error: updateError } = await supabase
    .from('stores')
    .update({
      status: 'PUBLISHED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId);

  if (updateError) {
    logger.error('Failed to update store status to PUBLISHED', {
      storeId,
      error: updateError.message,
    });
    throw new InternalError('حدث خطأ أثناء نشر المتجر.');
  }

  // 3. Multi-tier Cache Invalidation
  await revalidateStoreCache(storeId);

  const liveDomain = store.custom_domain || `${store.handle}.souqcloud.com`;
  const liveUrl = `https://${liveDomain}`;

  logger.info('Store published successfully', { storeId, handle: store.handle, liveUrl });

  return {
    status: 'PUBLISHED',
    liveUrl,
  };
}

/**
 * Unpublishes a store, reverting it to DRAFT status and hiding it from public shoppers.
 */
export async function unpublishStore(
  storeId: string
): Promise<{ status: StoreStatus }> {
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from('stores')
    .update({
      status: 'DRAFT',
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId);

  if (updateError) {
    logger.error('Failed to unpublish store', { storeId, error: updateError.message });
    throw new InternalError('حدث خطأ أثناء إلغاء نشر المتجر.');
  }

  // Multi-tier Cache Invalidation
  await revalidateStoreCache(storeId);

  logger.info('Store unpublished successfully', { storeId });

  return { status: 'DRAFT' };
}

/**
 * Updates a store's lifecycle status (DRAFT, PUBLISHED, MAINTENANCE, ARCHIVED).
 */
export async function updateStoreStatus(
  storeId: string,
  status: StoreStatus
): Promise<{ status: StoreStatus }> {
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from('stores')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId);

  if (updateError) {
    logger.error('Failed to update store status', { storeId, status, error: updateError.message });
    throw new InternalError('حدث خطأ أثناء تحديث حالة المتجر.');
  }

  // Multi-tier Cache Invalidation
  await revalidateStoreCache(storeId);

  logger.info('Store status updated', { storeId, status });

  return { status };
}

/**
 * Publishes a specific page, updating live sections and triggering cache invalidation.
 */
export async function publishStorePage(
  pageId: string,
  storeId: string
): Promise<{ newVersion: number }> {
  const result = await publishPageSections(pageId, storeId);
  await revalidateStoreCache(storeId, pageId);
  return result;
}
