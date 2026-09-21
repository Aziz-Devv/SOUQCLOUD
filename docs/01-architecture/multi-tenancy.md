Document: Multi-Tenancy
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-09-18
Depth: Full Spec
Dependencies: docs/00-product/product-principles.md, docs/01-architecture/architecture-rules.md
Related Documents: docs/01-architecture/identity-and-membership-model.md, docs/01-architecture/security-authz.md, docs/01-architecture/domain-model.md, docs/01-architecture/decisions/ADR-006-hosting-and-runtime-architecture.md, docs/02-database/schema-overview.md
Decisions: Shared database with logical tenant isolation via Row Level Security (RLS) & Composite Foreign Keys; two-tier tenancy hierarchy; edge tenant-host extraction and request routing via Next.js 16 proxy.ts within the Next.js 16 application deployed through OpenNext to the Cloudflare Workers runtime (workerd); authoritative tenant resolution executed via Supabase boundary (ADR-006).
Open Questions: None

# Multi-Tenancy Architecture & Isolation

## 1. Tenancy Model Strategy

The platform employs a **Shared Database, Logical Tenant Isolation** model powered by PostgreSQL Row Level Security (RLS), **Composite Foreign Key Constraints**, and edge tenant-host routing via Next.js 16 `proxy.ts` within the Next.js 16 application deployed through OpenNext to the Cloudflare Workers runtime (`workerd`).

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

## 4. Tenant Routing & Resolution Flow (Edge Proxy & Supabase Boundary)

Edge routing and tenant resolution operate across a strict two-stage boundary:
1. **Edge Boundary (`src/proxy.ts` on Cloudflare Workers / `workerd`)**:
   - Strips untrusted incoming `x-tenant-*` headers to prevent header injection.
   - Extracts and sanitizes the incoming `Host` header.
   - For subdomains (e.g. `shop.souqcloud.com`), extracts the store handle and rewrites paths to the storefront route group.
   - For custom domains (e.g. `shop.brand.com`), injects the sanitized `x-tenant-host` internal header and rewrites paths.
2. **Supabase Resolution Boundary (Downstream Server Components / RPC)**:
   - Performs authoritative custom domain resolution via `public.resolve_store_by_custom_domain(hostname)`.
   - Guarantees that only active, verified domains attached to published stores resolve to an active tenant context.

```
[ Incoming HTTP Request ]
          │
          ▼
[ Next.js 16 proxy.ts (Cloudflare Workers / workerd) ]
  - Strip untrusted client x-tenant-* headers
  - Extract & sanitize Host:
    • Subdomain: "fashion-brand.souqcloud.com"
    • Custom Domain: "www.fashionbrand.com"
          │
          ▼
[ Edge Request Routing & Internal Header Propagation ]
  - Injects internal x-tenant-host / x-tenant-handle
  - Rewrites internal route to /(storefront)/...
          │
          ▼
[ Downstream Server Components (Supabase Resolution Boundary) ]
  - Calls public.resolve_store_by_custom_domain(hostname)
          │
     ┌────┴────────────────────────┐
     │ Resolved & Published        │ Unresolved / Inactive
     ▼                             ▼
[ Render Storefront RSC ]       [ Return 404 Store Not Found ]
```
