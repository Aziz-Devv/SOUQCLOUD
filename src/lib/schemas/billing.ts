import { z } from 'zod';

export const PlanTierEnum = z.enum(['STARTER', 'GROWTH', 'PRO']);
export const BillingIntervalEnum = z.enum(['MONTHLY', 'YEARLY']);

export const CreateCheckoutSchema = z.object({
  merchantId: z.string().uuid('معرف التاجر غير صالح'),
  planTier: PlanTierEnum,
  billingInterval: BillingIntervalEnum.default('MONTHLY'),
  returnUrl: z.string().url('رابط العودة غير صالح').optional(),
});

export const CancelSubscriptionSchema = z.object({
  merchantId: z.string().uuid('معرف التاجر غير صالح'),
});

export type CreateCheckoutInput = z.infer<typeof CreateCheckoutSchema>;
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;
