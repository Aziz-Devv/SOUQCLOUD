Document: Phase 1 Scope
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-vision.md, docs/00-product/glossary.md
Related Documents: docs/00-product/non-goals.md, docs/00-product/roadmap.md, docs/00-product/personas-and-use-cases.md, docs/01-architecture/decisions/ADR-004-phase-1-payment-strategy.md, docs/01-architecture/decisions/ADR-005-commerce-state-machine-and-idempotency.md
Decisions: The complete end-to-end vertical slice boundary, Order Submission model, Store Order Modes (DASHBOARD, WHATSAPP, BOTH), Paddle SaaS subscription billing, deterministic tax calculation, and Customer entity lifecycle are locked.
Open Questions: None

# Phase 1 Scope — The Core Vertical Slice

## 1. Mission and Objective

The primary objective of **Phase 1** is to build, validate, and deliver a production-grade, end-to-end vertical slice of the platform.

Phase 1 focuses on completing the essential commerce lifecycle: allowing a merchant to sign up, establish a branded store, list products, publish their storefront, receive customer orders (via Dashboard, WhatsApp, or Both), and manage order fulfillment.

---

## 2. The 12-Step End-to-End Vertical Slice Flow

```
 [1. Register / Login]
         │
         ▼
 [2. Create Store (Set Operating Country & Order Mode)]
         │
         ▼
 [3. Select / Initialize Theme]
         │
         ▼
 [4. Add Product & Media]
         │
         ▼
 [5. Customize Store via Builder]
         │
         ▼
 [6. Publish Store]
         │
         ▼
 [7. Visit Public Storefront]
         │
         ▼
 [8. Add Product to Cart]
         │
         ▼
 [9. Enter Customer Info & Delivery Details]
         │
         ▼
 [10. Submit Order (CTA: "إتمام الطلب")]
         │
         ▼
 [11. Order Created in DB (Status: NEW)]
         │
         ├───────────────────┬───────────────────┐
         ▼                   ▼                   ▼
   [ DASHBOARD Mode ]  [ WHATSAPP Mode ]   [ BOTH Mode ]
   (Web Confirmation)  (WA Redirection)   (Web + WA Redirect)
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
 [12. Merchant Views & Manages Order in Dashboard]
```

---

## 3. Detailed Phase 1 Domain Specifications

### 3.1 Store Order Completion Modes
Each Store configures its fulfillment mode in `store.order_mode`:
1. **`DASHBOARD`**: Order is created in PostgreSQL; customer sees order confirmation receipt; merchant handles communication and payment collection externally.
2. **`WHATSAPP`**: Order is created in PostgreSQL; platform generates a formatted WhatsApp order summary and immediately redirects customer to merchant's verified WhatsApp phone number.
3. **`BOTH`**: Order is created in PostgreSQL; customer sees confirmation receipt with direct WhatsApp redirect action; order is visible and manageable in merchant Dashboard.

### 3.2 Order Persistence Precedence
The platform **always persists the Order to the database before redirecting to WhatsApp**. Order existence never depends on whether the customer sends the WhatsApp message.

### 3.3 Deterministic Tax & Monetary Calculations
* **Integer Arithmetic**: All monetary values are integer currency cents (`BIGINT`); tax rates are integer basis points (`INTEGER`).
* **Tax-Added Pricing**: Added to subtotal ($\text{tax} = (\text{subtotal} \times \text{basis\_points} + 5000) / 10000$).
* **Tax-Included Pricing**: Derived from gross price; tax amount is extracted and stored for reporting without being added again to the total.
* **Reconciliation Invariant**: $\text{orders.tax\_cents} = \sum (\text{order\_line\_items.tax\_cents})$.

### 3.4 Platform Subscription Billing (Paddle)
* Merchants subscribe to SaaS tiers via **Paddle** (`Merchant → Platform`).
* Architected through `BillingProviderAdapter` to remain provider-extensible.

### 3.5 Explicit Phase 1 Exclusions (Storefront Payments)
Phase 1 does **NOT** require:
* Storefront customer credit card checkout or payment processing.
* Merchant payment gateway integrations (e.g. Stripe, Tap, Moyasar).
* Online payment authorization, capture, or customer refunds.

---

## 4. Definition of "Phase 1 Complete"

Phase 1 is complete when:
1. All 12 steps of the vertical slice execute reliably.
2. Orders are persistently recorded in PostgreSQL and rendered in the merchant Dashboard.
3. WhatsApp redirection operates correctly from persisted order data.
4. Multi-tenant isolation is verified at database (RLS + composite foreign keys) and application levels.
