Document: Module: Billing & Subscriptions
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/billing.md, docs/01-architecture/decisions/ADR-004-phase-1-payment-strategy.md
Related Documents: docs/01-architecture/api-architecture.md, docs/02-database/entities/merchants.md
Decisions: SaaS platform monetization via Paddle; provider-agnostic BillingProviderAdapter interface; explicit Paddle subscription webhook event semantics (including subscription.resumed); provisional product commercial configuration.
Open Questions: None

# Module Specification: Billing & Platform Subscriptions (Paddle)

## 1. Purpose & Domain Scope
The Billing & Subscriptions module manages the platform's SaaS monetization model (`Merchant → Platform`). Merchants subscribe to platform plan tiers to operate their stores and unlock operational capacities. In Phase 1, platform subscription billing is powered by **Paddle** via the provider-agnostic `BillingProviderAdapter`.

> **CRITICAL DOMAIN DISTINCTION**: This module governs **Merchant Subscription Billing to the Platform**. Storefront customer orders (`Customer → Merchant`) are completely independent of this system.

---

## 2. Platform Subscription Lifecycle (Paddle)

```
[ Merchant in Dashboard ] ──(Select Plan)──► [ Paddle Checkout Overlay ]
                                                    │
                                                    ▼ (Merchant Completes Subscription)
[ Paddle Billing Engine ] ──(Inbound Webhook)─► [ POST /api/webhooks/billing/paddle ]
                                                    │
                                                    ├─ Verifies HMAC Webhook Signature
                                                    ├─ Parses Subscription Event Payload
                                                    │
                                                    ▼
                                     [ public.billing_subscriptions ]
                                     (Synchronizes Status & Entitlements)
```

---

## 3. Data Model References
* `public.billing_plans`: Data-driven plan configuration table.
* `public.billing_subscriptions`:
  * `id UUID PRIMARY KEY`
  * `merchant_id UUID NOT NULL REFERENCES public.merchants(id)`
  * `provider VARCHAR(50) NOT NULL DEFAULT 'paddle'`
  * `provider_customer_id VARCHAR(255) NOT NULL` (Paddle Customer ID: `ctm_...`)
  * `provider_subscription_id VARCHAR(255) NOT NULL UNIQUE` (Paddle Subscription ID: `sub_...`)
  * `plan_tier VARCHAR(50) NOT NULL DEFAULT 'STARTER'`
  * `status public.subscription_status NOT NULL DEFAULT 'TRIALING'`
  * `billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'` (`MONTHLY`, `YEARLY`)
  * `current_period_start TIMESTAMPTZ`, `current_period_end TIMESTAMPTZ`
  * `cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE`
  * `last_event_occurred_at TIMESTAMPTZ NULL` (Chronology tracking from Paddle event `occurred_at`)

---

## 4. Provisional Product Configuration & Entitlements

> [!NOTE]
> **Provisional Product Configuration**: The commercial parameters documented below — including plan names (Starter, Growth, Pro), pricing tiers, monthly/yearly amounts, product limits, store capacities, trial durations, and payment failure grace periods (e.g. 3-day grace period) — represent **provisional implementation defaults** subject to final commercial review and Product approval prior to production launch. The architecture stores these values dynamically in `public.billing_plans` so they can be modified by Product decisions without requiring architectural redesign.

* **Starter (Provisional Default)**: 1 Store, up to 50 active products, standard theme presets, Dashboard & WhatsApp order modes.
* **Growth (Provisional Default)**: Up to 3 Stores, up to 500 active products, custom domain support, priority support.
* **Pro (Provisional Default)**: Unlimited Stores, unlimited products, custom CSS tokens, advanced analytics.

---

## 5. Webhook Event Handling & State Synchronization

The internal billing subsystem derives subscription status dynamically from the verified Paddle event family:

| Paddle Webhook Event | Internal Subscription Status | System Entitlement Action |
|---|---|---|
| `subscription.created` | Derived from event payload (`status`) | Inserts subscription record; records provider customer/subscription IDs. |
| `subscription.activated` | `ACTIVE` | Activates merchant tier entitlements immediately. |
| `subscription.trialing` | `TRIALING` | Grants trial access with standard starter limits. |
| `subscription.updated` | Derived from event payload (`status`) | Synchronizes plan tier, interval, and `current_period_end`. Upgrades apply immediately; downgrades queue for period end. |
| `subscription.resumed` | `ACTIVE` | Synchronizes provider state and restores `ACTIVE` entitlements immediately. |
| `subscription.past_due` | `PAST_DUE` | Emits in-app warning banner; grants provisional grace period before restricting store publishing. |
| `subscription.paused` | `PAUSED` | Suspends active store publishing while preserving catalog data. |
| `subscription.canceled` | `CANCELED` | Reverts organization to free/trial baseline at `current_period_end`. |
| `transaction.completed` | (Invoice Persistence) | Inserts/updates `public.billing_invoices` with transaction total, currency, and hosted receipt URL. |
| `transaction.payment_failed` | `PAST_DUE` (if subscription renewal) | Logs failed payment attempt; dispatches merchant email alert. |

### 5.1 Invoice Persistence Mapping & Domain Invariants
When Paddle emits `transaction.completed` for a platform subscription charge:
* **Field Mapping to `public.billing_invoices`**:
  - `merchant_id` $\leftarrow$ `data.custom_data.merchant_id` (or resolved via associated subscription)
  - `provider_invoice_id` $\leftarrow$ `data.id` (Paddle transaction/invoice ID)
  - `amount_cents` $\leftarrow$ `data.details.totals.grand_total` (exact integer USD cents)
  - `currency` $\leftarrow$ `data.currency_code` (default `'USD'`)
  - `status` $\leftarrow$ `data.status` (`'PAID'` / `'COMPLETED'`)
  - `hosted_invoice_url` $\leftarrow$ `data.url` (Paddle hosted receipt URL)
  - `paid_at` $\leftarrow$ `data.billed_at`
* **Idempotency**: Handled atomically through `public.billing_webhook_events` deduplication on `(provider, provider_event_id)`.
* **Phase 1 Payment Boundary**: This event governs exclusively **Merchant SaaS Subscriptions to the Platform** (`Merchant → Platform`). Storefront customer payments (`Customer → Merchant`) remain strictly out of scope for Phase 1.

## 6. API Contract & Provider Adapter Interface

```typescript
export interface BillingProviderAdapter {
  createSubscriptionCheckout(
    merchantId: string,
    planTier: string,
    billingInterval: 'MONTHLY' | 'YEARLY',
    returnUrl: string
  ): Promise<{ checkoutUrl: string }>;

  verifyWebhookSignature(
    rawPayload: string,
    signatureHeader: string
  ): Promise<boolean>;

  handleSubscriptionWebhook(
    eventPayload: {
      event_id: string;
      event_type: string;
      data: any;
    }
  ): Promise<void>;

  cancelSubscription(
    providerSubscriptionId: string
  ): Promise<void>;
}
```

---

## 7. Acceptance Criteria (Given / When / Then)
* **Given** a merchant subscribing to a Growth plan, **When** Paddle emits a `subscription.activated` event, **Then** `billing_subscriptions.status` updates to `ACTIVE` and store limits are updated automatically.
* **Given** a paused subscription that is resumed, **When** Paddle emits a `subscription.resumed` event, **Then** `billing_subscriptions.status` is updated to `ACTIVE` and store publishing capabilities are restored immediately.
* **Given** a recurring subscription renewal failure, **When** Paddle emits `transaction.payment_failed` and `subscription.past_due`, **Then** `billing_subscriptions.status` is set to `PAST_DUE` and an administrative warning banner is displayed in the dashboard.

---

## 8. Implementation Status
* **Implementation Status**: Not Started
