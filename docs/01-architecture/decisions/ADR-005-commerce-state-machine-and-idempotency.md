Document: ADR-005: Storefront Order Submission, Merchant Order Lifecycle & WhatsApp Dispatch
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/glossary.md, docs/01-architecture/api-architecture.md
Related Documents: docs/03-modules/checkout.md, docs/03-modules/orders.md, docs/02-database/entities/orders.md
Decisions: Order creation occurs directly from validated cart submission before external communication; Three store order completion modes (DASHBOARD, WHATSAPP, BOTH); Deterministic merchant order lifecycle (NEW -> CONTACTED -> CONFIRMED -> PREPARING -> READY -> DELIVERED); WhatsApp message formatted from persisted Order.
Open Questions: None

# ADR-005: Storefront Order Submission, Merchant Order Lifecycle & WhatsApp Dispatch

## Status
Proposed (Draft Master Specification)

## Context
In Phase 1, storefront shoppers submit orders directly to merchants without online credit card processing. The platform facilitates order collection, merchant notifications, and optional WhatsApp redirection. Naive implementations risk losing orders if order persistence depends on client-side WhatsApp redirects or if merchants lack a structured fulfillment lifecycle.

## Decision
We enforce a robust **Server-Side Order Submission & Merchant Lifecycle Architecture**:

```
[ Customer Cart ] ──(Submit Order Info)──► [ Server Validation & DB Order Creation ]
                                                           │
                                                           ├─ Atomically creates Order & Line Items (Status: NEW)
                                                           ├─ Decrements variant inventory
                                                           ├─ Upserts customer record
                                                           │
                                                           ▼
                                         [ Store Order Mode Outcome ]
                                        ┌──────────────┼──────────────┐
                                        ▼              ▼              ▼
                                  [ DASHBOARD ]  [ WHATSAPP ]     [ BOTH ]
                                  (Shows Receipt) (Auto-Redirect) (Receipt + WA CTA)
```

### Key Architectural Invariants:
1. **Server-Side Order Persistence Precedence**:
   * The platform **always creates and commits the Order in the PostgreSQL database first** before returning a response or generating an external WhatsApp redirect.
   * Order existence never depends on the customer successfully sending a WhatsApp message.

2. **Configurable Store Order Completion Modes**:
   * `DASHBOARD`: Customer completes order on storefront; order appears in merchant Dashboard Orders; merchant handles communication and fulfillment independently.
   * `WHATSAPP`: Server creates Order, generates formatted WhatsApp message from the persisted order, and redirects customer to the merchant's configured WhatsApp number (`https://wa.me/<phone>?text=<encoded_order>`).
   * `BOTH`: Server creates Order, displays Order Confirmation screen with a direct "Complete via WhatsApp" action, and makes the order manageable in the Dashboard.

3. **WhatsApp Message Generation from Canonical Order**:
   * The WhatsApp text is compiled strictly server-side from the persisted `public.orders` and `public.order_line_items` records (including store name, order number, line items, quantities, totals, customer name, and delivery notes), never from untrusted client state.

4. **Merchant-Centric Order Lifecycle**:
   * Initial Status: `NEW`.
   * Standard Progression: `NEW` &rarr; `CONTACTED` &rarr; `CONFIRMED` &rarr; `PREPARING` &rarr; `READY` &rarr; `DELIVERED`.
   * Cancellation Paths: Allowed from `NEW`, `CONTACTED`, `CONFIRMED`, or `PREPARING` to `CANCELLED` (with optional inventory restocking).

## Consequences
### Positive
* Zero order loss: orders are permanently recorded in the database regardless of external network or WhatsApp client failures.
* Supports merchants operating via pure WhatsApp chat, pure web dashboard, or a hybrid of both.
* Clear operational lifecycle for tracking communication, preparation, and delivery.

### Negative / Tradeoffs
* Requires phone number formatting and country code normalization for merchants using WhatsApp modes.
