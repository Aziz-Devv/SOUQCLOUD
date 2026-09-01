Document: Non-Goals
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-vision.md
Related Documents: docs/00-product/phase-1-scope.md, docs/00-product/roadmap.md
Decisions: Scope boundaries established to prevent premature complexity; Storefront online customer payment processing is an explicit Phase 1 non-goal (reclassified as future roadmap).
Open Questions: None

# Platform Non-Goals

## 1. Purpose of Non-Goals

Building an efficient, reliable SaaS commerce platform requires maintaining strict engineering focus. This document explicitly defines what the platform is **intentionally NOT doing** in Phase 1.

---

## 2. Explicit Non-Goals for Phase 1

### 1. Storefront Online Customer Payment Processing (Phase 1 Non-Goal)
* **What We Are NOT Building**: We are not processing online credit card or digital wallet payments from storefront customers to merchants in Phase 1.
* **Boundary**: In Phase 1, the platform facilitates order submission and merchant-customer communication (via Dashboard and WhatsApp). Merchants collect funds independently (e.g. Cash on Delivery, Bank Transfer, in-person POS). Merchant payment gateway integrations (Stripe, Tap, Moyasar) are classified as Phase 2/3+ future capabilities.

### 2. Multi-Vendor Marketplace Infrastructure
* **What We Are NOT Building**: We are not building a shared multi-merchant catalog or Amazon/Etsy-style marketplace.
* **Boundary**: Every Store is strictly an independent, single-merchant retail entity.

### 3. Public App Marketplace & Arbitrary Script Execution
* **What We Are NOT Building**: We are not supporting third-party arbitrary server-side template scripting or a public app marketplace in early phases.
* **Boundary**: Storefront presentation is 100% schema-driven and declarative.

### 4. Automated International Tax & Accounting Engine
* **What We Are NOT Building**: We are not building real-time global tax nexus compliance or automated accounting filings.
* **Boundary**: Tax calculation uses deterministic basis points configured directly per store.

### 5. Multi-Warehouse Distributed Fulfillment & POS Hardware
* **What We Are NOT Building**: We are not building complex multi-facility inventory routing or physical POS hardware drivers.
* **Boundary**: Single-location inventory per variant with straightforward dashboard fulfillment tracking.

---

## 3. Scope Boundary Reference Table

| Capability Area | In Scope (Phase 1) | Explicit Non-Goal (Phase 1) |
|---|---|---|
| **Storefront Commerce** | Order Submission (Cart &rarr; Customer Info &rarr; Order) | Online Customer Card Checkout / Gateway Processing |
| **Order Communication** | Dashboard Management, WhatsApp Redirection | Automated Payment Gateways & Customer Card Captures |
| **Platform Billing** | SaaS Subscription Billing via Paddle | Storefront Customer Payment Processing |
| **Storefront Theming** | Schema-driven Theme Engine & Store Builder | Arbitrary merchant script / code upload |
| **Multi-Tenancy** | Single-merchant Stores with RLS & Composite FKs | Multi-vendor marketplace / cross-store carts |
