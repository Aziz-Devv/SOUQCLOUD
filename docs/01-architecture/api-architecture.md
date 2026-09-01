Document: API Architecture
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/01-architecture/architecture-overview.md, docs/01-architecture/architecture-rules.md
Related Documents: docs/01-architecture/error-handling.md, docs/01-architecture/security-authz.md, docs/03-modules/checkout.md, docs/01-architecture/decisions/ADR-004-phase-1-payment-strategy.md, docs/01-architecture/decisions/ADR-005-commerce-state-machine-and-idempotency.md
Decisions: Hybrid mutation strategy: Next.js Server Actions for Dashboard mutations, Route Handlers for Storefront Order Submission / Cart / Paddle Webhooks / Public API; Next.js 16 proxy.ts; Server-authoritative order creation via submit_storefront_order RPC; BillingProviderAdapter for Paddle.
Open Questions: None

# API Architecture

## 1. Architectural Strategy

The platform utilizes a dual-channel API architecture tailored to specific communication patterns:

```
┌────────────────────────────────────────────────────────┐
│               API Communication Channels               │
├──────────────────────────┬─────────────────────────────┤
│   Next.js Server Actions │    Next.js Route Handlers   │
├──────────────────────────┼─────────────────────────────┤
│ - Merchant Dashboard     │ - Storefront Order Submit   │
│ - Admin Forms & Settings │ - Cart State Mutations      │
│ - Theme Builder Updates  │ - Paddle Billing Webhooks   │
│ - Catalog & Order Admin  │ - Future Public API / Apps  │
└──────────────────────────┴─────────────────────────────┘
```

---

## 2. Cart API & Session Security Contract

Anonymous clients mutate cart state strictly through controlled server endpoints with HttpOnly session cookie validation that delegate to hardened PostgreSQL RPC functions:

```typescript
// Cart State Operations (Server Routes / Server Actions)
// GET /api/storefront/cart -> Calls public.get_or_create_storefront_cart(store_id, session_token)
// POST /api/storefront/cart/items -> Calls public.add_storefront_cart_item(store_id, cart_id, session_token, variant_id, qty)
// PATCH /api/storefront/cart/items/:id -> Calls public.update_storefront_cart_item(store_id, cart_id, session_token, line_id, qty)
// DELETE /api/storefront/cart/items/:id -> Calls public.update_storefront_cart_item(store_id, cart_id, session_token, line_id, 0)
```

* **Session Token Cookie**: `souqcloud_cart_token` (Server-generated cryptographically secure opaque UUID/session token, HttpOnly, Secure, SameSite=Lax).
* **Server-Authoritative Pricing**: Cart line prices are never accepted from the client; variant `price_cents` is queried directly from PostgreSQL inside the database functions.

---

## 3. Server-Authoritative Storefront Order Submission

Anonymous clients cannot insert records directly into the database. Orders are submitted via `POST /api/storefront/orders`:

```typescript
// Client Request Payload (Untrusted)
export interface SubmitOrderPayload {
  cart_id: string;
  customer_name: string;
  customer_phone: string; // Raw input phone (e.g. "0501234567")
  customer_email?: string; // Optional
  shipping_address?: {
    street: string;
    city: string;
    province?: string;
    postal_code?: string;
    country: string;
  };
  customer_notes?: string;
}

// Server Response Contract
export interface SubmitOrderResult {
  order_id: string;
  order_number: number;
  confirmation_token: string;
  order_mode_used: 'DASHBOARD' | 'WHATSAPP' | 'BOTH';
  whatsapp_redirect_url?: string;
}
```

### Server Execution Pipeline:
1. **Session Extraction & Phone Normalization**:
   - Extracts secret `session_token` from the `souqcloud_cart_token` cookie.
   - Normalizes raw input phone to E.164 using store's `default_country_code` (e.g. `0501234567` + `SA` &rarr; `+966501234567`). If invalid, returns `400 INVALID_PHONE_NUMBER`.
2. **Database RPC Execution**: Invokes `public.submit_storefront_order(p_store_id, p_cart_id, p_session_token, ...)`:
   - Validates that store is `PUBLISHED`, cart is `ACTIVE`, and session token matches.
   - Locks `store.order_sequence_counter` to assign an atomic, race-free order number.
   - Computes authoritative line-item tax and totals (supporting tax-inclusive and tax-added pricing).
   - Performs atomic stock decrement (`inventory_quantity >= qty OR allow_backorder = TRUE`).
   - Inserts `public.orders` (Status: `NEW`) and `public.order_line_items` with reconciled tax snapshots.
   - Generates a cryptographically secure `confirmation_token`.
   - Upserts `public.customers` on `(store_id, phone)`.
   - Transitions cart to `CONVERTED`.
   - Dynamically compiles WhatsApp URL if `order_mode` is `WHATSAPP` or `BOTH`.
3. **Returns `SubmitOrderResult`** to the client.

---

## 4. Protected Order Confirmation Endpoint

* `GET /api/storefront/orders/:orderId/confirmation?token=<confirmation_token>`
* **Privacy Enforcement**: Validates that the provided `token` matches `orders.confirmation_token` for that `order_id` (or matches the active session cookie). Raw Order IDs alone cannot view customer contact data.

---

## 5. Platform Subscription Billing Adapter (Paddle)

```typescript
export interface BillingProviderAdapter {
  createSubscriptionCheckout(
    merchantId: string,
    planTier: string,
    billingInterval: 'MONTHLY' | 'YEARLY',
    returnUrl: string
  ): Promise<{ checkoutUrl: string }>;

  verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean>;

  handleSubscriptionEvent(
    event: {
      event_id: string;
      event_type: string;
      data: any;
    }
  ): Promise<void>;
}
```

* Endpoint: `POST /api/webhooks/billing/paddle` processes incoming subscription lifecycle events (`subscription.created`, `subscription.activated`, `subscription.updated`, `subscription.resumed`, `subscription.past_due`, `subscription.paused`, `subscription.canceled`, `transaction.payment_failed`) with deduplication via `public.billing_webhook_events`.
