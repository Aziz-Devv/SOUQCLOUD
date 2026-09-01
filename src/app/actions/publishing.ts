'use server';

import {
  PublishStoreSchema,
  UnpublishStoreSchema,
  UpdateStoreStatusSchema,
  PublishPageSchema,
} from '@/lib/schemas/publishing';
import {
  publishStore,
  unpublishStore,
  updateStoreStatus,
  publishStorePage,
} from '@/lib/services/publishing-service';
import { ActionResult, StoreStatus } from '@/lib/types';
import { createSafeAction } from '@/lib/validation';

export async function publishStoreAction(
  rawInput: unknown
): Promise<ActionResult<{ status: StoreStatus; liveUrl: string }>> {
  return createSafeAction(PublishStoreSchema, rawInput, async (input) => {
    return await publishStore(input.storeId);
  });
}

export async function unpublishStoreAction(
  rawInput: unknown
): Promise<ActionResult<{ status: StoreStatus }>> {
  return createSafeAction(UnpublishStoreSchema, rawInput, async (input) => {
    return await unpublishStore(input.storeId);
  });
}

export async function updateStoreStatusAction(
  rawInput: unknown
): Promise<ActionResult<{ status: StoreStatus }>> {
  return createSafeAction(UpdateStoreStatusSchema, rawInput, async (input) => {
    return await updateStoreStatus(input.storeId, input.status);
  });
}

export async function publishPageAction(
  rawInput: unknown
): Promise<ActionResult<{ newVersion: number }>> {
  return createSafeAction(PublishPageSchema, rawInput, async (input) => {
    return await publishStorePage(input.pageId, input.storeId);
  });
}
