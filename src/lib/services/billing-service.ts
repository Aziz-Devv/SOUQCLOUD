import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors';
import { getAuthenticatedSessionContext } from './auth-service';
import {
  BillingPlan,
  MerchantSubscription,
  BillingInvoice,
  WebhookProcessResult,
  BillingInterval,
  PlanTier,
} from '../billing/types';
import { PaddleBillingAdapter } from '../billing/paddle-adapter';

const paddleAdapter = new PaddleBillingAdapter();

/**
 * Validates that the authenticated caller has access to the target merchant organization.
 */
async function verifyCallerMerchantAccess(merchantId: string) {
  const session = await getAuthenticatedSessionContext();
  if (!session) {
    throw new ForbiddenError('يجب تسجيل الدخول للوصول إلى بيانات الاشتراك والفوترة');
  }

  if (session.merchant.id !== merchantId) {
    throw new ForbiddenError('غير مصرح لك بالوصول إلى بيانات هذه المنشأة');
  }

  return session;
}

/**
 * Retrieves all active SaaS billing plans.
 */
export async function getBillingPlans(): Promise<BillingPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('monthly_price_cents', { ascending: true });

  if (error) {
    logger.error('Failed to fetch billing plans', { error: error.message });
    throw new AppError('INTERNAL_ERROR', 'فشل تحميل باقات الاشتراك');
  }

  return (data || []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    monthlyPriceCents: Number(p.monthly_price_cents),
    yearlyPriceCents: Number(p.yearly_price_cents),
    maxStores: p.max_stores,
    maxProductsPerStore: p.max_products_per_store,
    customDomainsEnabled: p.custom_domains_enabled,
    isActive: p.is_active,
  }));
}

/**
 * Retrieves the merchant's current platform subscription and tier entitlements.
 */
export async function getMerchantSubscription(
  merchantId: string
): Promise<MerchantSubscription> {
  await verifyCallerMerchantAccess(merchantId);
  const supabase = await createClient();

  const { data: sub, error } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch merchant subscription', { merchantId, error: error.message });
    throw new AppError('INTERNAL_ERROR', 'فشل تحميل بيانات الاشتراك');
  }

  // Fetch plan entitlements from billing_plans
  const plans = await getBillingPlans();
  const activePlanCode = sub?.plan_tier || 'STARTER';
  const planConfig = plans.find((p) => p.code === activePlanCode) || plans[0];

  if (!sub) {
    // Default baseline trial for newly onboarded merchant
    return {
      id: 'sub_default_trial',
      merchantId,
      provider: 'paddle',
      providerCustomerId: 'ctm_default',
      providerSubscriptionId: 'sub_trial',
      planTier: 'STARTER',
      status: 'TRIALING',
      billingInterval: 'MONTHLY',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      lastEventOccurredAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      planLimits: {
        maxStores: planConfig?.maxStores || 1,
        maxProductsPerStore: planConfig?.maxProductsPerStore || 50,
        customDomainsEnabled: planConfig?.customDomainsEnabled || false,
      },
    };
  }

  return {
    id: sub.id,
    merchantId: sub.merchant_id,
    provider: sub.provider,
    providerCustomerId: sub.provider_customer_id,
    providerSubscriptionId: sub.provider_subscription_id,
    planTier: sub.plan_tier,
    status: sub.status,
    billingInterval: sub.billing_interval,
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    lastEventOccurredAt: sub.last_event_occurred_at,
    createdAt: sub.created_at,
    updatedAt: sub.updated_at,
    planLimits: {
      maxStores: planConfig?.maxStores || 1,
      maxProductsPerStore: planConfig?.maxProductsPerStore || 50,
      customDomainsEnabled: planConfig?.customDomainsEnabled || false,
    },
  };
}

/**
 * Retrieves the merchant's historical billing invoices.
 */
export async function getMerchantInvoices(
  merchantId: string
): Promise<BillingInvoice[]> {
  await verifyCallerMerchantAccess(merchantId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('billing_invoices')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch merchant invoices', { merchantId, error: error.message });
    throw new AppError('INTERNAL_ERROR', 'فشل تحميل فواتير الاشتراك');
  }

  return (data || []).map((inv) => ({
    id: inv.id,
    merchantId: inv.merchant_id,
    providerInvoiceId: inv.provider_invoice_id,
    amountCents: Number(inv.amount_cents),
    currency: inv.currency,
    status: inv.status,
    hostedInvoiceUrl: inv.hosted_invoice_url,
    pdfDownloadUrl: inv.pdf_download_url,
    paidAt: inv.paid_at,
    createdAt: inv.created_at,
  }));
}

/**
 * Initiates a subscription checkout with Paddle.
 */
export async function createCheckoutSession(
  merchantId: string,
  planTier: PlanTier,
  billingInterval: BillingInterval,
  returnUrl?: string
) {
  await verifyCallerMerchantAccess(merchantId);
  return paddleAdapter.createSubscriptionCheckout(merchantId, planTier, billingInterval, returnUrl);
}

/**
 * Cancels a merchant's active platform subscription at the end of the current period.
 */
export async function cancelMerchantSubscription(merchantId: string): Promise<void> {
  const session = await verifyCallerMerchantAccess(merchantId);
  const supabase = await createClient();

  const { data: sub, error } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (error || !sub) {
    throw new NotFoundError('لا يوجد اشتراك نشط للإلغاء');
  }

  // Call Paddle API cancellation
  await paddleAdapter.cancelSubscription(sub.provider_subscription_id);

  // Update cancel_at_period_end flag in database
  const { error: updateError } = await supabase
    .from('billing_subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  if (updateError) {
    logger.error('Failed to update cancel_at_period_end flag', { merchantId, error: updateError.message });
    throw new AppError('INTERNAL_ERROR', 'فشل تحديث حالة إلغاء الاشتراك');
  }

  logger.info('Merchant scheduled subscription cancellation at period end', {
    merchantId,
    subscriptionId: sub.provider_subscription_id,
    userId: session.user.id,
  });
}

/**
 * Failure-Safe Atomic Webhook Processor.
 * Verifies signature on raw body, checks event chronology, and executes atomic DB transaction RPC.
 */
export async function processWebhookEvent(
  rawPayload: string,
  signatureHeader: string | null
): Promise<WebhookProcessResult> {
  // 1. Signature Verification on exact raw HTTP request body string
  const isValid = await paddleAdapter.verifyWebhookSignature(rawPayload, signatureHeader);
  if (!isValid) {
    throw new ForbiddenError('توقيع إشعار Paddle غير صالح (Invalid Webhook Signature)');
  }

  // 2. Parse JSON payload
  let parsedPayload: Record<string, unknown>;
  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    throw new AppError('VALIDATION_ERROR', 'بيانات إشعار Paddle غير صالحة');
  }

  const eventId = String(parsedPayload.event_id || '');
  const eventType = String(parsedPayload.event_type || '');
  const occurredAt = String(parsedPayload.occurred_at || new Date().toISOString());

  if (!eventId || !eventType) {
    throw new AppError('VALIDATION_ERROR', 'حقول إشعار Paddle الأساسية مفقودة');
  }

  // 3. Execute PostgreSQL Atomic Webhook Transaction RPC
  let supabase;
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  const { data, error } = await supabase.rpc('process_paddle_billing_webhook', {
    p_event_id: eventId,
    p_event_type: eventType,
    p_occurred_at: occurredAt,
    p_payload: parsedPayload,
  });

  if (error) {
    logger.error('Database process_paddle_billing_webhook RPC transaction failure', {
      eventId,
      eventType,
      error: error.message,
    });
    throw new AppError('INTERNAL_ERROR', 'فشل معالجة إشعار الفوترة في قاعدة البيانات');
  }

  const result = data as WebhookProcessResult;
  logger.info('Paddle webhook processed atomically', {
    eventId,
    eventType,
    status: result.status,
    reason: result.reason,
  });

  return result;
}
