Document: Glossary
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-vision.md
Related Documents: docs/00-product/product-principles.md, docs/00-product/personas-and-use-cases.md, docs/00-product/phase-1-scope.md, docs/02-database/entities/customers.md
Decisions: Core domain terms, structural relationships, Order Submission model, Customer phone-first identity, Store Order Modes, Paddle Platform Billing, and strict anti-synonym rules locked.
Open Questions: None

# Platform Domain Glossary

## 1. Purpose and Authority

This glossary defines the definitive vocabulary for the platform. Every term defined here represents a specific concept within the platform domain.

> **CRITICAL RULE**: Terms defined below have precise, non-interchangeable meanings. They must **never** be used as loose synonyms in documentation, architecture designs, data models, or application code.

---

## 2. Identity, Tenancy, and Customer Terms

### Auth Identity
The low-level authentication credential managed by Supabase Auth (`auth.users`).

### User
The platform-level profile record (`public.users`) corresponding to an Auth Identity.

### Membership
The relational association (`public.memberships`) linking a **User** to a **Merchant / Organization**, defining role permissions (`OWNER`, `ADMIN`, `STAFF`).

### Merchant / Organization
The top-level commercial and legal tenant entity (`public.merchants`). Holds the SaaS subscription billing relationship with the platform and owns Stores.

### Store
A distinct retail commerce container (`public.stores`) owned by a Merchant Organization. Holds catalog, themes, content pages, customers, and orders.

### Customer
A lightweight, first-class, store-scoped domain entity (`public.customers`) representing an end-consumer who browses or submits orders on a specific Storefront. Scoped strictly to `store_id`. In Phase 1's WhatsApp-first commerce, a Customer is identified primarily by **Phone Number**; email is optional (supports `email = NULL`).

---

## 3. Storefront Commerce & Order Submission Terms

### Cart
A temporary session state containing selected Products/Variants and quantities. Exists in `ACTIVE`, `CONVERTED`, or `EXPIRED` states.

### Order Submission
The process where a customer reviews their cart, inputs required contact (Name, Phone Number) and delivery details, and submits the order.

### Order
The canonical commercial contract record (`public.orders`) created by the platform upon order submission. Consists of:
1. **Immutable Commercial Snapshot**: Purchased line items, product title snapshots, SKU snapshots, unit prices in cents, tax snapshot, delivery fee snapshot, discount snapshot, customer contact details, and delivery notes.
2. **Mutable Operational State**: Status (`NEW`, `CONTACTED`, `CONFIRMED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`), merchant internal notes, and timestamps.
   * *`CONFIRMED` Status Definition*: The merchant has confirmed order details with the customer and intends to fulfill the order according to the merchant's business workflow.

### Store Order Mode
The store's configured fulfillment and communication workflow:
* `DASHBOARD`: Order is created in DB; customer sees web confirmation receipt; merchant manages fulfillment in Dashboard.
* `WHATSAPP`: Order is created in DB; platform generates formatted WhatsApp message and redirects customer to the merchant's WhatsApp number.
* `BOTH`: Order is created in DB; customer sees web confirmation receipt with direct WhatsApp redirect action; merchant manages order in Dashboard.

---

## 4. Platform Subscription Billing Terms

### Platform Subscription
The recurring commercial agreement between a **Merchant** and the **Platform** for access to software features and store capacity.

### Billing Provider Adapter (Paddle)
The provider-agnostic abstraction interface used for SaaS platform subscription billing. Phase 1 implements the **Paddle Adapter**.

### Storefront Customer Online Payment (Future Capability)
Direct credit card / gateway processing between storefront customers and merchants. **Explicitly out of scope for Phase 1** (merchants handle customer payments independently offline or via COD/bank transfer in Phase 1).

---

## 5. Strict Non-Synonym Reference Matrix

| Term A | Term B | Why They Are NOT Synonyms |
|---|---|---|
| **Platform Subscription Payment** | **Merchant Customer Order** | Platform Subscription is a Merchant paying the platform via Paddle; a Customer Order is a shopper submitting an order to a merchant. |
| **Order** | **Payment** | In Phase 1, an Order is a recorded commercial request; the platform does not process customer payment transactions. |
| **WhatsApp Message** | **Order Record** | WhatsApp is a communication channel; the PostgreSQL database `public.orders` record is the sole canonical source of truth. |
| **Merchant / Organization** | **User** | A Merchant is an organizational account owning stores; a User is an individual human. |
| **Theme** | **Page** | A Theme provides styling templates; Pages are store-owned content views that persist across theme switches. |
| **Customer** | **User** | A Customer is an end-shopper scoped to a single store; a User is an authenticated platform account holder. |
