import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors';
import { getAuthenticatedSessionContext } from './auth-service';
import {
  MediaAsset,
  MediaFilters,
  PresignedUploadResult,
  PrivateDownloadUrlResult,
} from '../media/types';
import {
  CreatePresignedUploadInput,
  RegisterMediaAssetInput,
} from '../schemas/media';
import {
  buildStorageKey,
  buildPublicCdnUrl,
  generateR2PresignedUploadUrl,
  generateR2PresignedDownloadUrl,
  deleteR2Object,
} from '../media/r2-client';

/**
 * Validates that the authenticated caller owns the requested store.
 */
async function verifyStoreAccess(storeId: string) {
  const session = await getAuthenticatedSessionContext();
  if (!session) {
    throw new ForbiddenError('يجب تسجيل الدخول لإدارة وسائط المتجر');
  }

  const supabase = await createClient();
  const { data: store, error } = await supabase
    .from('stores')
    .select('id, merchant_id')
    .eq('id', storeId)
    .eq('merchant_id', session.merchant.id)
    .maybeSingle();

  if (error || !store) {
    throw new ForbiddenError('غير مصرح لك بإدارة وسائط هذا المتجر');
  }

  return { session, store };
}

/**
 * Generates a short-lived (15-minute) direct-to-R2 presigned upload URL.
 */
export async function createPresignedUpload(
  input: CreatePresignedUploadInput
): Promise<PresignedUploadResult> {
  await verifyStoreAccess(input.storeId);

  const uuid = crypto.randomUUID();
  const storageKey = buildStorageKey(
    input.storeId,
    input.visibility,
    uuid,
    input.filename
  );

  const uploadUrl = await generateR2PresignedUploadUrl(
    storageKey,
    input.mimeType,
    900 // 15 minutes
  );

  const publicUrl =
    input.visibility === 'PUBLIC' ? buildPublicCdnUrl(storageKey) : null;

  return {
    uploadUrl,
    storageKey,
    publicUrl,
    expiresInSeconds: 900,
  };
}

/**
 * Registers an uploaded media asset's metadata in the database.
 */
export async function registerMediaAsset(
  input: RegisterMediaAssetInput
): Promise<MediaAsset> {
  await verifyStoreAccess(input.storeId);
  const supabase = await createClient();

  const publicUrl =
    input.visibility === 'PUBLIC' ? buildPublicCdnUrl(input.storageKey) : null;

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      store_id: input.storeId,
      storage_key: input.storageKey,
      filename: input.filename,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes,
      visibility: input.visibility,
      width: input.width || null,
      height: input.height || null,
      alt_text: input.altText || null,
      public_url: publicUrl,
    })
    .select('*')
    .single();

  if (error) {
    logger.error('Failed to register media asset in database', {
      storeId: input.storeId,
      storageKey: input.storageKey,
      error: error.message,
    });
    throw new AppError('INTERNAL_ERROR', 'فشل تسجيل الوسائط في قاعدة البيانات');
  }

  return {
    id: data.id,
    storeId: data.store_id,
    storageKey: data.storage_key,
    filename: data.filename,
    mimeType: data.mime_type,
    fileSizeBytes: Number(data.file_size_bytes),
    visibility: data.visibility,
    width: data.width,
    height: data.height,
    altText: data.alt_text,
    publicUrl: data.public_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Retrieves media assets belonging to a store.
 */
export async function getStoreMediaAssets(
  storeId: string,
  filters?: MediaFilters
): Promise<{ assets: MediaAsset[]; total: number }> {
  await verifyStoreAccess(storeId);
  const supabase = await createClient();

  let query = supabase
    .from('media_assets')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (filters?.visibility) {
    query = query.eq('visibility', filters.visibility);
  }

  if (filters?.mimeTypePrefix) {
    query = query.ilike('mime_type', `${filters.mimeTypePrefix}%`);
  }

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Failed to fetch store media assets', { storeId, error: error.message });
    throw new AppError('INTERNAL_ERROR', 'فشل تحميل وسائط المتجر');
  }

  const assets: MediaAsset[] = (data || []).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    storageKey: row.storage_key,
    filename: row.filename,
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes),
    visibility: row.visibility,
    width: row.width,
    height: row.height,
    altText: row.alt_text,
    publicUrl: row.public_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    assets,
    total: count || 0,
  };
}

/**
 * Generates an authenticated short-lived presigned download URL for private documents.
 */
export async function getPrivateAssetDownloadUrl(
  storeId: string,
  assetId: string
): Promise<PrivateDownloadUrlResult> {
  await verifyStoreAccess(storeId);
  const supabase = await createClient();

  const { data: asset, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', assetId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error || !asset) {
    throw new NotFoundError('الملف المطلوب غير موجود أو غير متاح لهذا المتجر');
  }

  if (asset.visibility === 'PUBLIC' && asset.public_url) {
    return {
      downloadUrl: asset.public_url,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Generate 15-minute presigned GET URL for private asset
  const downloadUrl = await generateR2PresignedDownloadUrl(asset.storage_key, 900);
  const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();

  return {
    downloadUrl,
    expiresAt,
  };
}

/**
 * Deletes a media asset from R2 and the database.
 */
export async function deleteMediaAsset(
  storeId: string,
  assetId: string
): Promise<void> {
  await verifyStoreAccess(storeId);
  const supabase = await createClient();

  const { data: asset, error } = await supabase
    .from('media_assets')
    .select('id, storage_key')
    .eq('id', assetId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error || !asset) {
    throw new NotFoundError('الملف المراد حذفه غير موجود');
  }

  // Delete physical object in R2
  await deleteR2Object(asset.storage_key);

  // Delete database record
  const { error: deleteError } = await supabase
    .from('media_assets')
    .delete()
    .eq('id', asset.id)
    .eq('store_id', storeId);

  if (deleteError) {
    logger.error('Failed to delete media asset record', {
      storeId,
      assetId,
      error: deleteError.message,
    });
    throw new AppError('INTERNAL_ERROR', 'فشل حذف سجل الوسائط');
  }
}
