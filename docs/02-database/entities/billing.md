Document: Entity: Billing & Subscriptions
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/merchants.md, docs/01-architecture/decisions/ADR-004-phase-1-payment-strategy.md
Related Documents: docs/03-modules/billing-subscriptions.md, docs/01-architecture/api-architecture.md
Decisions: Platform subscription billing managed at Merchant Organization level; integrated via Paddle in Phase 1; provider-abstracted; webhook event idempotency logging; provisional commercial plan configuration; decoupled from storefront commerce.
Open Questions: None

# Database Entity: Billing & Subscriptions (`public.billing_subscriptions`)

## 1. Purpose & Domain Scope

The billing domain manages recurring SaaS subscription plans, billing cycles, entitlement tiers, and invoices paid by **Merchants to the Platform** (`Merchant → Platform`). In Phase 1, platform subscription billing is powered by **Paddle** via the provider-agnostic `BillingProviderAdapter`.

---

## 2. Table Schema Definitions

```sql
CREATE TYPE public.subscription_status AS ENUM (
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'PAUSED',
  'CANCELED'
);

-- 1. SaaS Platform Subscription Plans (Provisional Commercial Schema)
-- Note: Values in this table represent provisional defaults subject to Product approval
CREATE TABLE public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,       -- e.g. STARTER, GROWTH, PRO
  name VARCHAR(100) NOT NULL,
  monthly_price_cents BIGINT NOT NULL,
  yearly_price_cents BIGINT NOT NULL,
  max_stores INTEGER NOT NULL DEFAULT 1,
  max_products_per_store INTEGER NOT NULL DEFAULT 50,
  custom_domains_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Merchant Platform Subscriptions Table
CREATE TABLE public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'paddle',
  provider_customer_id VARCHAR(255) NOT NULL,       -- Paddle Customer ID (ctm_...)
  provider_subscription_id VARCHAR(255) NOT NULL UNIQUE, -- Paddle Subscription ID (sub_...)
  plan_tier VARCHAR(50) NOT NULL DEFAULT 'STARTER',
  status public.subscription_status NOT NULL DEFAULT 'TRIALING',
  billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, YEARLY
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  last_event_occurred_at TIMESTAMPTZ NULL, -- Explicit timestamp of the latest successfully applied Paddle event
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_billing_merchant UNIQUE (merchant_id)
);

-- 3. Billing Webhook Events Table (Idempotency & Deduplication)
CREATE TABLE public.billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL DEFAULT 'paddle',
  provider_event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_billing_provider_event UNIQUE (provider, provider_event_id)
);

-- 4. Billing Invoices Table
CREATE TABLE public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- PAID, OPEN, VOID
  hosted_invoice_url TEXT NULL,
  pdf_download_url TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_merchant_id ON public.billing_subscriptions(merchant_id);
CREATE INDEX idx_billing_provider_sub ON public.billing_subscriptions(provider_subscription_id);
CREATE INDEX idx_billing_invoices_merchant ON public.billing_invoices(merchant_id, created_at DESC);
```

---

## 3. Subscription Lifecycle & Paddle Webhook Semantics

1. **Organization Scope**: Subscriptions belong to `merchant_id` (`CONSTRAINT uq_billing_merchant`), applying entitlement capacities across all stores owned by that merchant organization.
2. **Webhook Idempotency & Failure-Safe Transaction Boundary**:
   * Event recording and subscription/invoice mutation execute atomically inside a single PostgreSQL transaction.
   * If a duplicate event arrives (`(provider, provider_event_id)` exists in `public.billing_webhook_events`), it is recognized as already processed and returns `200 OK` (idempotent no-op).
   * A failed processing attempt does NOT commit `public.billing_webhook_events`, keeping the event retryable.
3. **Out-of-Order Webhook Chronology (`last_event_occurred_at`)**:
   * `last_event_occurred_at` represents exclusively the `occurred_at` timestamp from the Paddle event payload whose state mutation was successfully applied.
   * It is NEVER derived from `updated_at`, `current_period_start`, arrival time, or server time.
   * **Chronology Rule**:
     - If `last_event_occurred_at IS NULL` or `event.occurred_at >= last_event_occurred_at`: Apply state mutation, update `last_event_occurred_at = event.occurred_at`, and record event in `public.billing_webhook_events`.
     - If `event.occurred_at < last_event_occurred_at`: Do NOT apply mutation, do NOT regress persisted state; record event in `public.billing_webhook_events` as stale/skipped for audit/deduplication.
4. **Paddle Webhook Event Mapping**:
   * `subscription.created` &rarr; stores initial record with provider status.
   * `subscription.activated` &rarr; sets `status = 'ACTIVE'`, activates entitlements.
   * `subscription.trialing` &rarr; sets `status = 'TRIALING'`.
   * `subscription.updated` &rarr; syncs `plan_tier`, `billing_interval`, and `current_period_end`.
   * `subscription.resumed` &rarr; sets `status = 'ACTIVE'`, restores entitlements.
   * `subscription.past_due` &rarr; sets `status = 'PAST_DUE'`, triggers warning banner.
   * `subscription.paused` &rarr; sets `status = 'PAUSED'`.
   * `subscription.canceled` &rarr; sets `status = 'CANCELED'` or `cancel_at_period_end = TRUE`.
   * `transaction.completed` &rarr; inserts/updates `public.billing_invoices` (invoice ID, amount, currency, status, hosted receipt URL, paid timestamp).
   * `transaction.payment_failed` &rarr; records failed payment; marks subscription `PAST_DUE` if associated with renewal.
5. **Tokenization Security**: No raw credit cards or bank details are stored; provider tokens and customer IDs reside strictly in Paddle.

---

## 4. Row Level Security Policies

```sql
-- Authenticated Role: View subscription for authorized organization
CREATE POLICY merchant_billing_isolation ON public.billing_subscriptions
  FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT public.get_authenticated_merchant_ids()));

CREATE POLICY merchant_invoices_isolation ON public.billing_invoices
  FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT public.get_authenticated_merchant_ids()));

-- Service Role: Full access for Paddle webhook receiver
```
