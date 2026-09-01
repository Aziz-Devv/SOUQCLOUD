'use server';

import {
  CreateProductSchema,
  UpdateProductSchema,
  DeleteProductSchema,
  UpdateInventorySchema,
} from '@/lib/schemas/product';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  updateVariantInventory,
} from '@/lib/services/product-service';
import { ActionResult } from '@/lib/types';
import { createSafeAction } from '@/lib/validation';

export async function createProductAction(
  rawInput: unknown
): Promise<ActionResult<{ productId: string; handle: string }>> {
  return createSafeAction(CreateProductSchema, rawInput, async (input) => {
    const result = await createProduct(input);
    return {
      productId: result.productId,
      handle: result.handle,
    };
  });
}

export async function updateProductAction(
  rawInput: unknown
): Promise<ActionResult<{ productId: string }>> {
  return createSafeAction(UpdateProductSchema, rawInput, async (input) => {
    return await updateProduct(input);
  });
}

export async function deleteProductAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(DeleteProductSchema, rawInput, async (input) => {
    await deleteProduct(input.productId, input.storeId);
    return { success: true };
  });
}

export async function updateInventoryAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(UpdateInventorySchema, rawInput, async (input) => {
    await updateVariantInventory(input.variantId, input.storeId, input.quantity);
    return { success: true };
  });
}
