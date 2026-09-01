'use server';

import { CheckHandleSchema, CreateStoreSchema } from '@/lib/schemas/store';
import {
  checkStoreHandleAvailability,
  createMerchantStore,
} from '@/lib/services/store-service';
import { ActionResult } from '@/lib/types';
import { createSafeAction } from '@/lib/validation';

export async function checkHandleAction(
  rawInput: unknown
): Promise<ActionResult<{ available: boolean; reason?: string }>> {
  return createSafeAction(CheckHandleSchema, rawInput, async (input) => {
    return await checkStoreHandleAvailability(input.handle);
  });
}

export async function createStoreAction(
  rawInput: unknown
): Promise<ActionResult<{ storeId: string; handle: string }>> {
  return createSafeAction(CreateStoreSchema, rawInput, async (input) => {
    const result = await createMerchantStore(input);
    return {
      storeId: result.storeId,
      handle: result.handle,
    };
  });
}
