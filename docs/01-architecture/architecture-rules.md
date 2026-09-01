Document: Architecture Rules
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-principles.md, docs/01-architecture/architecture-overview.md
Related Documents: docs/01-architecture/multi-tenancy.md, docs/01-architecture/security-authz.md, docs/01-architecture/identity-and-membership-model.md
Decisions: Core architectural invariants, Order persistence precedence, Store Order Modes, Paddle platform billing isolation, composite foreign keys, and integer calculation rules locked.
Open Questions: None

# Architecture Rules & Constraints

## 1. Purpose of Architecture Rules

This document establishes the hard technical rules and invariants governing the platform. These rules are binding on all engineering implementations, coding agents, and architectural extensions.

---

## 2. Hard Architectural Rules

### Rule 1: Two-Tier Ownership Scoping (No Blanket `store_id`)
* **Organization Scope (`merchant_id`)**: `merchants`, `memberships`, `merchant_settings`, `billing_subscriptions`, `audit_logs`.
* **Store Scope (`store_id`)**: `stores`, `products`, `variants`, `themes`, `pages`, `customers`, `carts`, `cart_lines`, `orders`, `order_line_items`, `media_assets`.

### Rule 2: Structural Tenant Referential Integrity (Composite Foreign Keys)
* Child tables referencing tenant-scoped parents MUST declare composite foreign keys (e.g. `FOREIGN KEY (product_id, store_id) REFERENCES public.products(id, store_id)`), preventing cross-tenant referencing at the database engine level.

### Rule 3: Server-Side Order Persistence Precedence
* The platform must **always persist and commit the Order in PostgreSQL before** redirecting the customer or returning a success response.
* Order creation must never depend on whether a customer successfully sends an external WhatsApp message.

### Rule 4: Store Order Mode Determinism
* Every store must have a valid `order_mode` (`DASHBOARD`, `WHATSAPP`, or `BOTH`).
* If `WHATSAPP` or `BOTH` is configured but the store's WhatsApp phone number is missing or invalid, the system must fail safely by recording the Order in the database and falling back to a web confirmation receipt rather than dropping the order.

### Rule 5: Platform Billing vs Storefront Commerce Separation
* Platform subscription billing (`Merchant → Platform` via Paddle) is completely decoupled from storefront customer orders (`Customer → Merchant`).
* Storefront customer online payments are not processed by the platform in Phase 1.

### Rule 6: Integer Monetary & Tax Calculations (No Floats)
* All money values are stored as integer currency cents (`BIGINT`). Tax rates are stored as integer basis points (`INTEGER`, where `1500 = 15.00%`). Floating-point math is strictly forbidden.

### Rule 7: Orders Historical Snapshot Immutability
* Placed orders capture an immutable snapshot of line items (title, variant title, SKU, unit price, quantity, total price, tax snapshot, shipping snapshot, customer details, and delivery notes). Catalog edits must never mutate historical order line records.

### Rule 8: Next.js 16 `proxy.ts` Lightweight Routing
* `proxy.ts` executes within the Next.js Node.js runtime and must remain lightweight, resolving tenant `store_id` via an in-memory/KV cache and avoiding heavy runtime database lookups in the proxy path.
