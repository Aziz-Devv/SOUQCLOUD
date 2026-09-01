Document: Information Architecture
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/personas-and-use-cases.md, docs/01-architecture/domain-model.md
Related Documents: docs/04-ux-ui/dashboard-ux.md, docs/04-ux-ui/storefront-ux.md, docs/00-product/phase-1-scope.md
Decisions: Structured sitemap and URL routing conventions; explicit Order Submission navigation and Store Order Mode settings.
Open Questions: None

# Information Architecture & Sitemap

## 1. Overview

This document outlines the structural hierarchy, navigation trees, and URL routing taxonomy across the **Merchant Dashboard** and the **Public Storefront**.

---

## 2. Merchant Dashboard Information Architecture

### 2.1 Phase 1 Implemented Navigation Tree
```
[ Merchant Dashboard Root (/app) ]
  │
  ├── [ Home / Overview ] ──────────────────► /app/home
  │
  ├── [ Orders ] ───────────────────────────► /app/orders
  │     └── Order Detail & Fulfillment ─────► /app/orders/[id]
  │
  ├── [ Products ] ─────────────────────────► /app/products
  │     ├── Add Product ────────────────────► /app/products/new
  │     └── Edit Product & Variants ────────► /app/products/[id]
  │
  ├── [ Customers ] ────────────────────────► /app/customers
  │     └── Customer Detail ────────────────► /app/customers/[id]
  │
  ├── [ Online Store ] ─────────────────────► /app/online-store
  │     ├── Themes & Store Builder ─────────► /app/online-store/themes
  │     │     └── Visual Customizer ────────► /app/online-store/themes/[id]/editor
  │     └── Pages ──────────────────────────► /app/online-store/pages
  │
  └── [ Settings ] ─────────────────────────► /app/settings
        ├── General Store Details ──────────► /app/settings/general
        ├── Order Mode & WhatsApp ──────────► /app/settings/order-mode
        ├── Shipping (Flat Rate) ───────────► /app/settings/shipping
        └── Taxes (Basis Points) ───────────► /app/settings/taxes
```

### 2.2 Phase 2+ Future Navigation Expansions (Blueprint)
* `/app/settings/billing` (SaaS subscription billing via Paddle - Phase 1/2)
* `/app/settings/payments` (Future merchant online payment gateways - Phase 2+)
* `/app/products/collections` (Phase 2)
* `/app/settings/team` (Multi-staff invitations - Phase 2)
* `/app/settings/domains` (Custom domain DNS management - Phase 2)

---

## 3. Public Storefront Information Architecture

```
[ Public Storefront (store.souqcloud.com) ]
  │
  ├── [ Homepage ] ─────────────────────────► /
  │
  ├── [ Catalog / Products ] ───────────────► /products
  │     └── Product Detail Page (PDP) ──────► /products/[handle]
  │
  ├── [ Content & Policy Pages ] ───────────► /pages/[slug]
  │
  ├── [ Cart Drawer / Page ] ───────────────► /cart
  │
  ├── [ Order Submission Flow ] ────────────► /checkout
  │     └── Customer Info & Delivery Details
  │
  └── [ Order Confirmation / Receipt ] ─────► /orders/[orderId]/confirmation
```
