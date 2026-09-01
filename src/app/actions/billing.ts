'use server';

import { createSafeAction } from '@/lib/validation';
import {
  CreateCheckoutSchema,
  CancelSubscriptionSchema,
} from '@/lib/schemas/billing';
import {
  createCheckoutSession,
  cancelMerchantSubscription,
} from '@/lib/services/billing-service';
import { ActionResult } from '@/lib/types';
import { CheckoutSessionResult } from '@/lib/billing/types';

export async function createBillingCheckoutAction(
  rawInput: unknown
): Promise<ActionResult<CheckoutSessionResult>> {
  return createSafeAction(CreateCheckoutSchema, rawInput, async (input) => {
    const result = await createCheckoutSession(
      input.merchantId,
      input.planTier,
      input.billingInterval,
      input.returnUrl
    );
    return result;
  });
}

export async function cancelBillingSubscriptionAction(
  rawInput: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return createSafeAction(CancelSubscriptionSchema, rawInput, async (input) => {
    await cancelMerchantSubscription(input.merchantId);
    return { success: true };
  });
}
