'use server';

import { createSafeAction } from '@/lib/validation';
import {
  CreatePresignedUploadSchema,
  RegisterMediaAssetSchema,
  GetPrivateDownloadUrlSchema,
  DeleteMediaAssetSchema,
  GetStoreMediaFiltersSchema,
} from '@/lib/schemas/media';
import {
  createPresignedUpload,
  registerMediaAsset,
  getStoreMediaAssets,
  getPrivateAssetDownloadUrl,
  deleteMediaAsset,
} from '@/lib/services/media-service';
import { ActionResult } from '@/lib/types';
import {
  MediaAsset,
  PresignedUploadResult,
  PrivateDownloadUrlResult,
} from '@/lib/media/types';

export async function createPresignedUploadAction(
  rawInput: unknown
): Promise<ActionResult<PresignedUploadResult>> {
  return createSafeAction(CreatePresignedUploadSchema, rawInput, async (input) => {
    return createPresignedUpload(input);
  });
}

export async function registerMediaAssetAction(
  rawInput: unknown
): Promise<ActionResult<MediaAsset>> {
  return createSafeAction(RegisterMediaAssetSchema, rawInput, async (input) => {
    return registerMediaAsset(input);
  });
}

export async function getStoreMediaAssetsAction(
  rawInput: unknown
): Promise<ActionResult<{ assets: MediaAsset[]; total: number }>> {
  return createSafeAction(GetStoreMediaFiltersSchema, rawInput, async (input) => {
    return getStoreMediaAssets(input.storeId, {
      visibility: input.visibility,
      mimeTypePrefix: input.mimeTypePrefix,
      limit: input.limit,
      offset: input.offset,
    });
  });
}

export async function getPrivateDownloadUrlAction(
  rawInput: unknown
): Promise<ActionResult<PrivateDownloadUrlResult>> {
  return createSafeAction(GetPrivateDownloadUrlSchema, rawInput, async (input) => {
    return getPrivateAssetDownloadUrl(input.storeId, input.assetId);
  });
}

export async function deleteMediaAssetAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(DeleteMediaAssetSchema, rawInput, async (input) => {
    await deleteMediaAsset(input.storeId, input.assetId);
    return { success: true };
  });
}
