Document: ADR-004: Phase 1 Platform Subscription Billing (Paddle) & Provider Adapter Architecture
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/phase-1-scope.md, docs/01-architecture/api-architecture.md
Related Documents: docs/03-modules/billing-subscriptions.md, docs/02-database/entities/billing.md
Decisions: Platform subscription billing uses Paddle via a provider-agnostic Billing Adapter; storefront customer payments are NOT processed by the platform in Phase 1 (customer payment gateways classified as future capability).
Open Questions: None

# ADR-004: Phase 1 Platform Subscription Billing (Paddle) & Provider Adapter Architecture

## Status
Proposed (Draft Master Specification)

## Context
The platform's monetization model requires merchants to pay recurring SaaS subscription fees to the platform (`Merchant → Platform`). Conversely, storefront customer orders (`Customer → Merchant`) are submitted directly to merchants without online platform payment intermediation in Phase 1 (merchants collect funds independently via Cash on Delivery, Bank Transfer, or offline arrangements).

We need an explicit architectural distinction between:
1. **Platform Subscription Billing**: Managed centrally for SaaS revenue.
2. **Storefront Customer Orders**: Facilitated via order submission, WhatsApp redirection, and dashboard fulfillment.

## Decision
We establish **Paddle** as the Phase 1 SaaS platform subscription billing provider, accessed via a **Provider-Agnostic Billing Adapter**:

1. **Platform Billing Isolation (`BillingProviderAdapter`)**:
   Platform subscription workflows interact through an abstract billing interface:
   * `createSubscriptionCheckout(merchantId: string, planId: string): Promise<CheckoutUrlResult>`
   * `verifyWebhookSignature(payload: string, signature: string): WebhookEvent`
   * `handleSubscriptionEvent(event: WebhookEvent): Promise<void>`
   * `cancelSubscription(subscriptionId: string): Promise<void>`

2. **Phase 1 Concrete Billing Adapter**:
   * **Paddle Adapter**: Handles SaaS subscription checkout overlays, recurring billing cycles, tier upgrades, and subscription cancellations.
   * Merchant entities are associated with Paddle customer/subscription IDs in the billing domain (`public.billing_subscriptions`), leaving store and catalog entities decoupled from billing provider specifics.

3. **Storefront Customer Payment Boundary**:
   * The platform does **not** process customer payments to merchants in Phase 1.
   * Future online merchant payment gateways (e.g., Stripe, Tap, Moyasar) remain architectural Blueprints for Phase 2/3+.

4. **Webhook Event Chronology & State Synchronization Rule**:
   * To prevent out-of-order Paddle webhook events from regressing persisted subscription state, `public.billing_subscriptions` maintains `last_event_occurred_at TIMESTAMPTZ NULL`.
   * **Semantic Definition**: `last_event_occurred_at` represents exclusively the `occurred_at` timestamp of the latest Paddle webhook event whose state mutation was successfully applied. It MUST NOT be derived from `updated_at`, `current_period_start`, arrival time, or server time.
   * **Chronology Rule**:
     - If `last_event_occurred_at IS NULL` or `event.occurred_at >= last_event_occurred_at`: Apply the state mutation, update `last_event_occurred_at = event.occurred_at`, and record the event in `public.billing_webhook_events`.
     - If `event.occurred_at < last_event_occurred_at`: Do NOT apply the state mutation, do NOT regress the persisted state, but still record the webhook event in `public.billing_webhook_events` as an audit/deduplication entry so future retries are safely recognized as processed.

## Consequences
### Positive
* Clearly separates SaaS platform revenue from storefront commerce.
* Keeps store catalog and customer order domains clean and decoupled from third-party payment gateways.
* Enables swapping or adding another SaaS billing provider in the future without schema restructuring.

### Negative / Tradeoffs
* Requires maintaining the `BillingProviderAdapter` interface abstraction for platform subscriptions.
