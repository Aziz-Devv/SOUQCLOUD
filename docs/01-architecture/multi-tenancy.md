Document: Multi-Tenancy
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-principles.md, docs/01-architecture/architecture-rules.md
Related Documents: docs/01-architecture/identity-and-membership-model.md, docs/01-architecture/security-authz.md, docs/01-architecture/domain-model.md, docs/02-database/schema-overview.md
Decisions: Shared database with logical tenant isolation via Row Level Security (RLS) & Composite Foreign Keys; two-tier tenancy hierarchy; Hostname tenant resolution via Next.js 16 proxy.ts on Node.js runtime.
Open Questions: None

# Multi-Tenancy Architecture & Isolation

## 1. Tenancy Model Strategy

The platform employs a **Shared Database, Logical Tenant Isolation** model powered by PostgreSQL Row Level Security (RLS), **Composite Foreign Key Constraints**, and Next.js 16 `proxy.ts` tenant resolution on the Node.js runtime.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TWO-TIER TENANCY HIERARCHY                      │
├───────────────────────────────────┬────────────────────────────────────┤
│ Tier 1: Organization Scope        │ Tier 2: Store Scope                │
│ (merchant_id)                     │ (store_id)                         │
├───────────────────────────────────┼────────────────────────────────────┤
│ - merchants                       │ - stores                           │
│ - memberships                     │ - products & variants              │
│ - merchant_settings               │ - themes, pages & sections         │
│ - billing_subscriptions           │ - media_assets                     │
│ - audit_logs                      │ - customers, carts, cart_lines     │
│                                   │ - orders & order_line_items        │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Structural Tenant Referential Integrity (Composite Foreign Keys)

```sql
-- Parent Table: products
ALTER TABLE public.products
  ADD CONSTRAINT uq_products_id_store UNIQUE (id, store_id);

-- Child Table: variants
ALTER TABLE public.variants
  ADD CONSTRAINT fk_variants_product_store
  FOREIGN KEY (product_id, store_id)
  REFERENCES public.products(id, store_id)
  ON DELETE CASCADE;

-- Child Table: order_line_items
ALTER TABLE public.order_line_items
  ADD CONSTRAINT fk_order_line_items_order_store
  FOREIGN KEY (order_id, store_id)
  REFERENCES public.orders(id, store_id)
  ON DELETE CASCADE;
```

---

## 3. RLS Security Functions & Policy Conventions

```sql
CREATE OR REPLACE FUNCTION public.get_authenticated_merchant_ids()
RETURNS SETOF UUID AS $$
  SELECT merchant_id FROM public.memberships
  WHERE user_id = auth.uid() AND status = 'ACTIVE';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_authenticated_store_ids()
RETURNS SETOF UUID AS $$
  SELECT s.id FROM public.stores s
  WHERE s.merchant_id IN (SELECT public.get_authenticated_merchant_ids());
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 4. Tenant Resolution Flow (Next.js 16 `proxy.ts` on Node.js Runtime)

```
[ Incoming HTTP Request ]
          │
          ▼
[ Next.js 16 proxy.ts (Node.js runtime) ]
  Extract Hostname:
  - e.g., "fashion-brand.souqcloud.com" (Subdomain)
  - e.g., "www.fashionbrand.com" (Custom Domain)
          │
          ▼
[ In-Memory / KV Tenant Cache Lookup ]
          │
     ┌────┴────────────────────────┐
     │ Resolved                    │ Unresolved
     ▼                             ▼
[ Inject Request Headers & Rewrite ] [ Return 404 Store Not Found ]
  x-tenant-store-id: <uuid>
  x-tenant-merchant-id: <uuid>
  Rewrite: /(storefront)/...
```
