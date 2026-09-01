'use server';

import { createSafeAction } from '@/lib/validation';
import { SubmitOrderSchema } from '@/lib/schemas/order-submission';
import {
  submitStorefrontOrder,
  OrderSubmissionResult,
} from '@/lib/services/order-submission-service';
import { ActionResult } from '@/lib/types';

export async function submitOrderAction(
  rawInput: unknown
): Promise<ActionResult<OrderSubmissionResult>> {
  return createSafeAction(SubmitOrderSchema, rawInput, async (input) => {
    return await submitStorefrontOrder(input);
  });
}
