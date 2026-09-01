import { describe, it, expect } from 'vitest';
import {
  PlanTierEnum,
  BillingIntervalEnum,
  CreateCheckoutSchema,
  CancelSubscriptionSchema,
} from '../src/lib/schemas/billing';

describe('Billing Validation Schemas', () => {
  it('validates allowed plan tiers and billing intervals', () => {
    expect(PlanTierEnum.safeParse('STARTER').success).toBe(true);
    expect(PlanTierEnum.safeParse('GROWTH').success).toBe(true);
    expect(PlanTierEnum.safeParse('PRO').success).toBe(true);
    expect(PlanTierEnum.safeParse('ENTERPRISE').success).toBe(false);

    expect(BillingIntervalEnum.safeParse('MONTHLY').success).toBe(true);
    expect(BillingIntervalEnum.safeParse('YEARLY').success).toBe(true);
    expect(BillingIntervalEnum.safeParse('WEEKLY').success).toBe(false);
  });

  describe('CreateCheckoutSchema', () => {
    it('accepts valid checkout payload with defaults', () => {
      const parsed = CreateCheckoutSchema.safeParse({
        merchantId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        planTier: 'GROWTH',
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.billingInterval).toBe('MONTHLY');
      }
    });

    it('rejects invalid merchantId UUID', () => {
      const parsed = CreateCheckoutSchema.safeParse({
        merchantId: 'not-a-uuid',
        planTier: 'GROWTH',
      });

      expect(parsed.success).toBe(false);
    });
  });

  describe('CancelSubscriptionSchema', () => {
    it('accepts valid merchantId UUID', () => {
      const parsed = CancelSubscriptionSchema.safeParse({
        merchantId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
      });

      expect(parsed.success).toBe(true);
    });
  });
});
