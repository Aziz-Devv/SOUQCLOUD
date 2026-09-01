Document: Domain Model
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/glossary.md, docs/01-architecture/architecture-overview.md
Related Documents: docs/01-architecture/identity-and-membership-model.md, docs/01-architecture/multi-tenancy.md, docs/02-database/schema-overview.md, docs/02-database/entities/customers.md
Decisions: Explicit bounded contexts established; Customer aggregate defined; Order Submission and Store Order Mode domain models; Paddle Platform Subscription Billing domain.
Open Questions: None

# Domain Model & Bounded Contexts

## 1. Domain Overview

The platform domain is structured into discrete **Bounded Contexts** to maintain strong internal cohesion and clear entity boundaries:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PLATFORM BOUNDED CONTEXTS                       │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Identity & Access        │ Auth Identity, User, Membership, Role       │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Tenancy & Store          │ Merchant / Organization, Store, OrderMode   │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Customer Management      │ Customer (Store-scoped profile & history)   │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Catalog & Inventory      │ Product, Variant, Option, InventoryQuantity │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Presentation & Themes    │ Theme (Presets/Tokens), Page, Section       │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Media Asset Management   │ MediaAsset (Public CDN vs Private Signed)   │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Shopping & Cart          │ Cart, CartLine                              │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Orders & Fulfillment     │ Order, OrderLineItem (Status: NEW..DELIVER) │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Platform Billing (SaaS)  │ BillingSubscription, Plan, BillingCustomer  │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Transactional Messaging  │ Notification, WhatsAppDispatcher, EventLog  │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 2. Aggregate Roots & Invariants

### 2.1 Identity Aggregate
* **Root**: `User`
* **Invariants**: 1:1 sync with `auth.users`. Memberships assign roles within Organizations.

### 2.2 Store Aggregate
* **Root**: `Store`
* **Entities**: `OrderModeConfig`, `WhatsAppConfig`
* **Invariants**: Scoped to `merchant_id`. Configures `order_mode` (`DASHBOARD`, `WHATSAPP`, `BOTH`).

### 2.3 Order Aggregate
* **Root**: `Order`
* **Entities**: `OrderLineItem`
* **Invariants**:
  * Scoped to `store_id`.
  * Created upon valid Order Submission.
  * Status Lifecycle: `NEW` &rarr; `CONTACTED` &rarr; `CONFIRMED` &rarr; `PREPARING` &rarr; `READY` &rarr; `DELIVERED` (or `CANCELLED`).
  * Captures immutable commercial snapshots of line items, prices, delivery fee, tax, customer contact details, and notes.

### 2.4 Platform Billing Aggregate
* **Root**: `BillingSubscription`
* **Entities**: `BillingPlan`, `BillingInvoice`
* **Invariants**: Scoped to `merchant_id`. Manages SaaS subscription via **Paddle**. Completely isolated from storefront customer orders.
