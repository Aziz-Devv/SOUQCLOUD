'use server';

import { createSafeAction } from '@/lib/validation';
import {
  UpdateOrderStatusSchema,
  CancelOrderSchema,
  UpdateOrderNotesSchema,
} from '@/lib/schemas/order-management';
import {
  updateOrderStatus,
  cancelOrder,
  updateOrderNotes,
} from '@/lib/services/order-management-service';
import { ActionResult } from '@/lib/types';

export async function updateOrderStatusAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(UpdateOrderStatusSchema, rawInput, async (input) => {
    await updateOrderStatus(input.storeId, input.orderId, input.newStatus, input.merchantNotes);
    return { success: true };
  });
}

export async function cancelOrderAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(CancelOrderSchema, rawInput, async (input) => {
    await cancelOrder(input.storeId, input.orderId, input.reason, input.restockInventory);
    return { success: true };
  });
}

export async function updateOrderNotesAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(UpdateOrderNotesSchema, rawInput, async (input) => {
    await updateOrderNotes(input.storeId, input.orderId, input.merchantNotes);
    return { success: true };
  });
}
