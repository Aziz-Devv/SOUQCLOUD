-- SOUQCLOUD Database Migration: Platform Subscriptions & Billing (Paddle)
-- Version: 20260823000009
-- Description: Establishes billing plans, merchant subscriptions with last_event_occurred_at,
--              billing webhook events for failure-safe idempotency, invoices, grants, and atomic webhook RPC.

BEGIN;

-- 1. Subscription Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM (
      'TRIALING',
      'ACTIVE',
      'PAST_DUE',
      'PAUSED',
      'CANCELED'
    );
  END IF;
END $$;

-- 2. SaaS Platform Subscription Plans (Provisional Commercial Schema in USD Cents)
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,       -- STARTER, GROWTH, PRO
  name VARCHAR(100) NOT NULL,
  monthly_price_cents BIGINT NOT NULL CHECK (monthly_price_cents >= 0),
  yearly_price_cents BIGINT NOT NULL CHECK (yearly_price_cents >= 0),
  max_stores INTEGER NOT NULL DEFAULT 1 CHECK (max_stores >= 1),
  max_products_per_store INTEGER NOT NULL DEFAULT 50 CHECK (max_products_per_store >= 1),
  custom_domains_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Merchant Platform Subscriptions Table
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'paddle',
  provider_customer_id VARCHAR(255) NOT NULL,            -- Paddle Customer ID (ctm_...)
  provider_subscription_id VARCHAR(255) NOT NULL UNIQUE,      -- Paddle Subscription ID (sub_...)
  plan_tier VARCHAR(50) NOT NULL DEFAULT 'STARTER',
  status public.subscription_status NOT NULL DEFAULT 'TRIALING',
  billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_interval IN ('MONTHLY', 'YEARLY')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  last_event_occurred_at TIMESTAMPTZ NULL,                -- Chronology tracking from Paddle event occurred_at
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_billing_merchant UNIQUE (merchant_id)
);

-- 4. Billing Webhook Events Table (Idempotency & Deduplication)
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL DEFAULT 'paddle',
  provider_event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_billing_provider_event UNIQUE (provider, provider_event_id)
);

-- 5. Billing Invoices Table
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,                            -- PAID, OPEN, VOID
  hosted_invoice_url TEXT NULL,
  pdf_download_url TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_merchant_id ON public.billing_subscriptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_billing_provider_sub ON public.billing_subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_merchant ON public.billing_invoices(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_provider_event ON public.billing_webhook_events(provider, provider_event_id);

-- 6. Provisional Plan Data Seeding (USD Integer Cents)
INSERT INTO public.billing_plans (code, name, monthly_price_cents, yearly_price_cents, max_stores, max_products_per_store, custom_domains_enabled, is_active)
VALUES
  ('STARTER', 'الباقة الأساسية (Starter)', 0, 0, 1, 50, FALSE, TRUE),
  ('GROWTH', 'باقة النمو (Growth)', 19900, 199000, 3, 500, TRUE, TRUE),
  ('PRO', 'الباقة الاحترافية (Pro)', 49900, 499000, 100, 100000, TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 7. Row Level Security (RLS)
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- Plans are visible to authenticated and public for pricing discovery
DROP POLICY IF EXISTS billing_plans_read_policy ON public.billing_plans;
CREATE POLICY billing_plans_read_policy ON public.billing_plans
  FOR SELECT TO public, authenticated
  USING (is_active = TRUE);

-- Subscriptions are visible to authorized merchant members
DROP POLICY IF EXISTS merchant_billing_subscriptions_isolation ON public.billing_subscriptions;
CREATE POLICY merchant_billing_subscriptions_isolation ON public.billing_subscriptions
  FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT public.get_authenticated_merchant_ids()));

-- Invoices are visible to authorized merchant members
DROP POLICY IF EXISTS merchant_billing_invoices_isolation ON public.billing_invoices;
CREATE POLICY merchant_billing_invoices_isolation ON public.billing_invoices
  FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT public.get_authenticated_merchant_ids()));

-- 8. Table-level Privileges
GRANT SELECT ON public.billing_plans TO authenticated, anon;
GRANT SELECT ON public.billing_subscriptions TO authenticated;
GRANT SELECT ON public.billing_invoices TO authenticated;

GRANT ALL ON public.billing_plans TO service_role;
GRANT ALL ON public.billing_subscriptions TO service_role;
GRANT ALL ON public.billing_webhook_events TO service_role;
GRANT ALL ON public.billing_invoices TO service_role;

-- 9. PostgreSQL Atomic Webhook Processing Function
CREATE OR REPLACE FUNCTION public.process_paddle_billing_webhook(
  p_event_id TEXT,
  p_event_type TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_already_processed BOOLEAN;
  v_merchant_id UUID;
  v_customer_id TEXT;
  v_subscription_id TEXT;
  v_invoice_id TEXT;
  v_status_raw TEXT;
  v_status_mapped public.subscription_status;
  v_plan_tier TEXT;
  v_interval TEXT;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_cancel_at_period_end BOOLEAN := FALSE;
  v_existing_sub RECORD;
  v_invoice_amount BIGINT;
  v_invoice_currency VARCHAR(3);
  v_invoice_status TEXT;
  v_hosted_url TEXT;
  v_pdf_url TEXT;
  v_paid_at TIMESTAMPTZ;
BEGIN
  -- 1. Deduplication Check: if event was already processed, return idempotent response
  SELECT EXISTS(
    SELECT 1 FROM public.billing_webhook_events
    WHERE provider = 'paddle' AND provider_event_id = p_event_id
  ) INTO v_already_processed;

  IF v_already_processed THEN
    RETURN jsonb_build_object(
      'status', 'DUPLICATE',
      'already_processed', true,
      'event_id', p_event_id
    );
  END IF;

  -- 2. Extract Event Data Fields
  v_subscription_id := p_payload->'data'->>'id';
  v_customer_id := p_payload->'data'->>'customer_id';
  
  -- Resolve merchant_id from custom_data if present
  IF (p_payload->'data'->'custom_data'->>'merchant_id') IS NOT NULL THEN
    BEGIN
      v_merchant_id := (p_payload->'data'->'custom_data'->>'merchant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_merchant_id := NULL;
    END;
  END IF;

  -- 3. Handle Subscription Events Family
  IF p_event_type LIKE 'subscription.%' THEN
    -- Check existing subscription record by subscription_id or merchant_id
    SELECT * INTO v_existing_sub
    FROM public.billing_subscriptions
    WHERE provider_subscription_id = v_subscription_id
       OR (v_merchant_id IS NOT NULL AND merchant_id = v_merchant_id)
    LIMIT 1;

    IF v_existing_sub.id IS NOT NULL AND v_merchant_id IS NULL THEN
      v_merchant_id := v_existing_sub.merchant_id;
    END IF;

    -- If no merchant can be identified, abort
    IF v_merchant_id IS NULL THEN
      RAISE EXCEPTION 'MERCHANT_NOT_IDENTIFIABLE' USING ERRCODE = 'P0002';
    END IF;

    -- 4. Out-of-Order Webhook Chronology Validation
    IF v_existing_sub.id IS NOT NULL
       AND v_existing_sub.last_event_occurred_at IS NOT NULL
       AND p_occurred_at < v_existing_sub.last_event_occurred_at THEN
      -- Stale/out-of-order event: DO NOT mutate state, DO NOT update timestamp.
      -- Record in billing_webhook_events for audit/deduplication.
      INSERT INTO public.billing_webhook_events (
        provider,
        provider_event_id,
        event_type,
        payload,
        processed_at
      ) VALUES (
        'paddle',
        p_event_id,
        p_event_type,
        p_payload,
        NOW()
      );

      RETURN jsonb_build_object(
        'status', 'SKIPPED_STALE',
        'reason', 'Event occurred_at is older than last_event_occurred_at',
        'event_id', p_event_id,
        'occurred_at', p_occurred_at,
        'last_event_occurred_at', v_existing_sub.last_event_occurred_at
      );
    END IF;

    -- 5. Map Event Status
    v_status_raw := lower(COALESCE(p_payload->'data'->>'status', ''));
    IF p_event_type = 'subscription.activated' OR p_event_type = 'subscription.resumed' THEN
      v_status_mapped := 'ACTIVE';
    ELSIF p_event_type = 'subscription.trialing' OR v_status_raw = 'trialing' THEN
      v_status_mapped := 'TRIALING';
    ELSIF p_event_type = 'subscription.past_due' OR v_status_raw = 'past_due' THEN
      v_status_mapped := 'PAST_DUE';
    ELSIF p_event_type = 'subscription.paused' OR v_status_raw = 'paused' THEN
      v_status_mapped := 'PAUSED';
    ELSIF p_event_type = 'subscription.canceled' OR v_status_raw = 'canceled' THEN
      v_status_mapped := 'CANCELED';
    ELSE
      -- subscription.created or subscription.updated
      IF v_status_raw = 'active' THEN
        v_status_mapped := 'ACTIVE';
      ELSIF v_status_raw = 'past_due' THEN
        v_status_mapped := 'PAST_DUE';
      ELSIF v_status_raw = 'paused' THEN
        v_status_mapped := 'PAUSED';
      ELSIF v_status_raw = 'canceled' THEN
        v_status_mapped := 'CANCELED';
      ELSE
        v_status_mapped := 'TRIALING';
      END IF;
    END IF;

    -- Extract Plan Tier from custom_data or default
    v_plan_tier := UPPER(COALESCE(
      p_payload->'data'->'custom_data'->>'plan_tier',
      p_payload->'data'->'items'->0->'price'->'custom_data'->>'plan_tier',
      v_existing_sub.plan_tier,
      'STARTER'
    ));

    -- Extract Interval
    v_interval := UPPER(COALESCE(
      p_payload->'data'->'billing_cycle'->>'interval',
      v_existing_sub.billing_interval,
      'MONTHLY'
    ));
    IF v_interval NOT IN ('MONTHLY', 'YEARLY') THEN
      v_interval := 'MONTHLY';
    END IF;

    -- Extract Billing Period
    v_period_start := COALESCE(
      (p_payload->'data'->'current_billing_period'->>'starts_at')::timestamptz,
      v_existing_sub.current_period_start,
      NOW()
    );
    v_period_end := COALESCE(
      (p_payload->'data'->'current_billing_period'->>'ends_at')::timestamptz,
      v_existing_sub.current_period_end,
      NOW() + INTERVAL '30 days'
    );

    IF (p_payload->'data'->'scheduled_change'->>'action') = 'cancel' THEN
      v_cancel_at_period_end := TRUE;
    ELSE
      v_cancel_at_period_end := FALSE;
    END IF;

    -- 6. Upsert Subscription State
    INSERT INTO public.billing_subscriptions (
      merchant_id,
      provider,
      provider_customer_id,
      provider_subscription_id,
      plan_tier,
      status,
      billing_interval,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      last_event_occurred_at,
      created_at,
      updated_at
    ) VALUES (
      v_merchant_id,
      'paddle',
      COALESCE(v_customer_id, 'ctm_sandbox'),
      v_subscription_id,
      v_plan_tier,
      v_status_mapped,
      v_interval,
      v_period_start,
      v_period_end,
      v_cancel_at_period_end,
      p_occurred_at,
      NOW(),
      NOW()
    )
    ON CONFLICT (merchant_id) DO UPDATE SET
      provider = 'paddle',
      provider_customer_id = EXCLUDED.provider_customer_id,
      provider_subscription_id = EXCLUDED.provider_subscription_id,
      plan_tier = EXCLUDED.plan_tier,
      status = EXCLUDED.status,
      billing_interval = EXCLUDED.billing_interval,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      last_event_occurred_at = EXCLUDED.last_event_occurred_at,
      updated_at = NOW();

  -- 7. Handle Invoice / Transaction Events Family
  ELSIF p_event_type LIKE 'transaction.%' OR p_event_type LIKE 'invoice.%' THEN
    v_invoice_id := COALESCE(p_payload->'data'->>'id', p_payload->'data'->>'invoice_id');
    
    IF v_merchant_id IS NOT NULL AND v_invoice_id IS NOT NULL THEN
      v_invoice_amount := COALESCE((p_payload->'data'->'details'->'totals'->>'grand_total')::bigint, 0);
      v_invoice_currency := UPPER(COALESCE(p_payload->'data'->>'currency_code', 'USD'));
      v_invoice_status := UPPER(COALESCE(p_payload->'data'->>'status', 'PAID'));
      v_hosted_url := p_payload->'data'->'url';
      v_pdf_url := NULL;
      
      IF v_invoice_status = 'PAID' OR v_invoice_status = 'COMPLETED' THEN
        v_paid_at := COALESCE((p_payload->'data'->>'billed_at')::timestamptz, NOW());
      ELSE
        v_paid_at := NULL;
      END IF;

      INSERT INTO public.billing_invoices (
        merchant_id,
        provider_invoice_id,
        amount_cents,
        currency,
        status,
        hosted_invoice_url,
        pdf_download_url,
        paid_at,
        created_at
      ) VALUES (
        v_merchant_id,
        v_invoice_id,
        v_invoice_amount,
        v_invoice_currency,
        v_invoice_status,
        v_hosted_url,
        v_pdf_url,
        v_paid_at,
        NOW()
      )
      ON CONFLICT (provider_invoice_id) DO UPDATE SET
        status = EXCLUDED.status,
        hosted_invoice_url = EXCLUDED.hosted_invoice_url,
        paid_at = EXCLUDED.paid_at;
    END IF;

    -- If payment failed for renewal, update subscription to PAST_DUE if subscription exists
    IF p_event_type = 'transaction.payment_failed' AND v_subscription_id IS NOT NULL THEN
      UPDATE public.billing_subscriptions
      SET status = 'PAST_DUE',
          last_event_occurred_at = p_occurred_at,
          updated_at = NOW()
      WHERE provider_subscription_id = v_subscription_id;
    END IF;
  END IF;

  -- 8. Record the webhook event for deduplication and audit trail
  INSERT INTO public.billing_webhook_events (
    provider,
    provider_event_id,
    event_type,
    payload,
    processed_at
  ) VALUES (
    'paddle',
    p_event_id,
    p_event_type,
    p_payload,
    NOW()
  );

  RETURN jsonb_build_object(
    'status', 'PROCESSED',
    'event_id', p_event_id,
    'event_type', p_event_type,
    'merchant_id', v_merchant_id
  );
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.process_paddle_billing_webhook(TEXT, TEXT, TIMESTAMPTZ, JSONB) TO authenticated, service_role;

COMMIT;
