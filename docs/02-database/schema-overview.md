Document: Database Schema Overview
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/01-architecture/architecture-overview.md, docs/01-architecture/multi-tenancy.md
Related Documents: docs/02-database/conventions.md, docs/02-database/entities/identities.md, docs/02-database/entities/customers.md, docs/02-database/entities/orders.md, docs/02-database/entities/billing.md
Decisions: PostgreSQL on Supabase; Postgres Grants + RLS dual-layer authorization; Composite Foreign Keys for structural tenant integrity; server-authoritative commerce transactions; Full Spec Paddle platform billing.
Open Questions: None

# Database Schema Overview

## 1. Database Architecture & Schemas

The platform uses **PostgreSQL** hosted via **Supabase**. Authorization combines table-level **Postgres Grants** with **Row Level Security (RLS)** policies and **Composite Foreign Key integrity**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          POSTGRESQL SCHEMAS                            │
├───────────────────────────────────┬────────────────────────────────────┤
│ auth schema (Supabase Managed)    │ public schema (Application Domain) │
├───────────────────────────────────┼────────────────────────────────────┤
│ - auth.users                      │ - users                            │
│ - auth.identities                 │ - memberships                      │
│ - auth.sessions                   │ - merchants                        │
│ - auth.refresh_tokens             │ - stores                           │
│                                   │ - customers                        │
│                                   │ - products & variants              │
│                                   │ - themes, pages & sections         │
│                                   │ - media_assets                     │
│                                   │ - carts & cart_lines               │
│                                   │ - orders & order_line_items        │
│                                   │ - billing_subscriptions (Paddle)   │
│                                   │ - billing_plans & billing_invoices │
│                                   │ - billing_webhook_events           │
│                                   │ - notifications                    │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Entity Relationship Diagram

```
[ auth.users ] ──── (1:1 sync) ────► [ public.users ]
                                            │
                                            ▼
[ public.merchants ] ◄── (N:1) ─── [ public.memberships ]
         │ (1:N)
         ├──────► [ billing_subscriptions ] (Paddle SaaS Billing)
         │              ├── [ billing_plans ]
         │              └── [ billing_invoices ]
         ▼
  [ public.stores ] (order_mode: DASHBOARD | WHATSAPP | BOTH)
         │
         ├──────► [ customers ] (id, store_id)
         ├──────► [ themes ] ──────► [ pages (version CAS) ]
         ├──────► [ products ] ────► [ variants (stock check) ]
         ├──────► [ media_assets (PUBLIC vs PRIVATE) ]
         ├──────► [ carts ] ───────► [ cart_lines ]
         │                              │ (Submit Order via RPC)
         │                              ▼
         └──────► [ orders ] ──────► [ order_line_items ]
```

---

## 3. Structural Integrity & Authorization Invariants

1. **Postgres Role Grants**: Coarse table-level access granted to `anon` (storefront catalog reads strictly filtered by RLS; mutations revoked), `authenticated` (merchant), and `service_role` (webhooks).
2. **Composite Foreign Keys**: All child tables reference `(parent_id, store_id)` composite keys, preventing any record in Store A from referencing an entity in Store B.
3. **Server-Authoritative Orders**: Placed orders create permanent immutable line item snapshots in `public.orders` and `public.order_line_items` through the secure `public.submit_storefront_order` RPC function.
