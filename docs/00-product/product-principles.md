Document: Product Principles
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-vision.md
Related Documents: docs/00-product/glossary.md, docs/01-architecture/architecture-rules.md
Decisions: 10 governing product principles; explicit separation of platform billing from merchant customer orders; canonical order persistence precedence.
Open Questions: None

# Product Principles

## 1. Ten Core Principles

### Principle 1: Server-Side Order Persistence Precedence
The platform must always persist customer orders to the database before redirecting to external communication channels (e.g. WhatsApp). Order existence must never depend on client-side actions.

### Principle 2: Separation of Platform Billing from Storefront Commerce
Platform SaaS subscription billing (`Merchant → Platform` via Paddle) is completely distinct from customer orders (`Customer → Merchant`). The platform does not intermediate customer payments in Phase 1.

### Principle 3: Multi-Channel Operational Flexibility
Merchants have diverse operational preferences. The platform must natively support Dashboard management, WhatsApp direct messaging, and hybrid workflows seamlessly.

### Principle 4: Frictionless Shopper Journey
Storefront shoppers should never face unnecessary registration forms or payment friction. The order submission path must be blazing fast and accessible.

### Principle 5: Schema-Driven Declarative Customization
Storefront theming must be 100% schema-driven. Merchants should never need to write raw template code or manage server scripts.

### Principle 6: Strict Tenant Isolation by Default
Every database query and mutation must enforce tenant boundaries via PostgreSQL Row Level Security (RLS) and Composite Foreign Keys.

### Principle 7: Performance as a Core Feature
Storefront pages must achieve sub-second render times, Core Web Vitals excellence, and global edge CDN delivery.

### Principle 8: Deterministic Monetary & Tax Calculations
All prices, discounts, delivery fees, and taxes must be calculated using exact integer arithmetic (cents and basis points).

### Principle 9: Data Integrity & Immutability of Orders
Placed orders must capture an immutable snapshot of purchased products, quantities, prices, and customer details, preserving historical accuracy independent of catalog updates.

### Principle 10: Extensibility Without Architectural Rewrite
Every core capability (e.g., Billing Adapter, Future Payment Gateways) must be designed behind provider abstractions so future phases never require monolithic restructuring.
