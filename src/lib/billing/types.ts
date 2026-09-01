export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'PAUSED'
  | 'CANCELED';

export type BillingInterval = 'MONTHLY' | 'YEARLY';

export type PlanTier = 'STARTER' | 'GROWTH' | 'PRO';

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  maxStores: number;
  maxProductsPerStore: number;
  customDomainsEnabled: boolean;
  isActive: boolean;
}

export interface MerchantSubscription {
  id: string;
  merchantId: string;
  provider: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  planTier: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  lastEventOccurredAt: string | null;
  createdAt: string;
  updatedAt: string;
  planLimits?: {
    maxStores: number;
    maxProductsPerStore: number;
    customDomainsEnabled: boolean;
  };
}

export interface BillingInvoice {
  id: string;
  merchantId: string;
  providerInvoiceId: string;
  amountCents: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  pdfDownloadUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PaddleWebhookEventPayload {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: Record<string, unknown>;
}

export interface WebhookProcessResult {
  status: 'PROCESSED' | 'DUPLICATE' | 'SKIPPED_STALE';
  event_id: string;
  reason?: string;
  merchant_id?: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
}

export interface BillingProviderAdapter {
  createSubscriptionCheckout(
    merchantId: string,
    planTier: string,
    billingInterval: BillingInterval,
    returnUrl?: string
  ): Promise<CheckoutSessionResult>;

  verifyWebhookSignature(
    rawPayload: string,
    signatureHeader: string | null,
    secretKey?: string
  ): Promise<boolean>;

  cancelSubscription(
    providerSubscriptionId: string
  ): Promise<{ success: boolean }>;
}
