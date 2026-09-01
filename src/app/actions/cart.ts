'use server';

import { createSafeAction } from '@/lib/validation';
import {
  AddToCartSchema,
  UpdateCartLineSchema,
  RemoveCartLineSchema,
  GetCartSchema,
} from '@/lib/schemas/cart';
import {
  getOrCreateCart,
  addToCart,
  updateCartLine,
  removeCartLine,
  StorefrontCart,
} from '@/lib/services/cart-service';
import { ActionResult } from '@/lib/types';

export async function getCartAction(rawInput: unknown): Promise<ActionResult<StorefrontCart>> {
  return createSafeAction(GetCartSchema, rawInput, async (input) => {
    return await getOrCreateCart(input.storeId);
  });
}

export async function addToCartAction(rawInput: unknown): Promise<ActionResult<StorefrontCart>> {
  return createSafeAction(AddToCartSchema, rawInput, async (input) => {
    return await addToCart(input.storeId, input.variantId, input.quantity, input.cartId);
  });
}

export async function updateCartLineAction(
  rawInput: unknown
): Promise<ActionResult<StorefrontCart>> {
  return createSafeAction(UpdateCartLineSchema, rawInput, async (input) => {
    return await updateCartLine(input.storeId, input.cartId, input.lineId, input.quantity);
  });
}

export async function removeCartLineAction(
  rawInput: unknown
): Promise<ActionResult<StorefrontCart>> {
  return createSafeAction(RemoveCartLineSchema, rawInput, async (input) => {
    return await removeCartLine(input.storeId, input.cartId, input.lineId);
  });
}
