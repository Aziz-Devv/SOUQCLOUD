Document: Next.js Structure
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/01-architecture/architecture-overview.md, docs/01-architecture/architecture-rules.md
Related Documents: docs/03-modules/storefront-rendering.md, docs/03-modules/dashboard-shell.md, docs/05-infrastructure/cloudflare-setup.md
Decisions: Next.js 16 App Router deployed on Node.js container runtime; proxy.ts on Node.js runtime for lightweight tenant routing; fronted by Cloudflare Edge for DNS, TLS/SSL, WAF, CDN caching, and cache purge; Paddle billing webhooks and storefront order endpoints.
Open Questions: None

# Next.js Application Structure & Runtime Strategy

## 1. Runtime Architecture & Deployment Boundary

The system operates across a clear, tiered runtime boundary:

```text
Internet
   ↓
Cloudflare Edge
   ├── DNS
   ├── TLS / SSL
   ├── WAF
   ├── CDN
   ├── Edge caching
   └── Cache purge
   ↓
Next.js Application
   ↓
proxy.ts
   └── Node.js runtime
   ↓
Routes / Server Components / Server Actions
   ↓
Supabase / PostgreSQL / Application Services
```

---

## 2. Project Organization Overview

```
src/
├── app/
│   ├── (auth)/                     # Unauthenticated merchant authentication flows
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   │
│   ├── (dashboard)/app/            # Authenticated Merchant Dashboard
│   │   ├── layout.tsx              # Dashboard Shell (Sidebar + Top Bar)
│   │   ├── home/                   # Store overview & metrics
│   │   ├── orders/                 # Order list & fulfillment views
│   │   ├── products/               # Product catalog & inventory
│   │   ├── customers/              # Customer profiles & history
│   │   ├── online-store/           # Themes, Store Builder & Pages
│   │   └── settings/               # General, order-mode, shipping, taxes
│   │
│   ├── (storefront)/               # Public customer storefront (Server Components / ISR)
│   │   ├── layout.tsx              # Storefront Layout (Theme CSS Injection)
│   │   ├── page.tsx                # Dynamic homepage (resolved via tenant)
│   │   ├── products/[handle]/      # Product Detail Page (PDP)
│   │   ├── pages/[slug]/           # Custom content page
│   │   ├── cart/                   # Cart page / drawer
│   │   └── checkout/               # Order submission flow
│   │
│   ├── api/                        # HTTP Route Handlers
│   │   ├── storefront/orders/      # Order submission & WhatsApp URL compilation
│   │   ├── media/                  # Presigned upload URL endpoints
│   │   └── webhooks/billing/paddle # Inbound Paddle SaaS billing webhooks
│   │
│   └── globals.css                 # Base Design system CSS variables
│
├── proxy.ts                        # Next.js 16 Network Proxy on Node.js Runtime (Tenant Routing)
│
├── components/                     # Reusable UI component libraries
│   ├── ui/                         # Design system primitives (buttons, modals, tables)
│   ├── dashboard/                  # Dashboard-specific composite widgets
│   ├── storefront/                 # Storefront components (PDP gallery, variant selector)
│   └── theme-sections/             # Modular section components rendered by Theme Engine
│
└── lib/                            # Shared core business logic & infrastructure clients
    ├── supabase/                   # Supabase client factories (server, admin)
    ├── auth/                       # Session helpers & RBAC permission guards
    ├── services/                   # Domain service layer (products, orders, whatsapp)
    ├── billing/                    # Paddle billing provider adapter
    ├── schemas/                    # Zod validation schemas
    └── storage/                    # Cloudflare R2 presigned URL helpers
```

---

## 3. Next.js 16 `proxy.ts` Routing & Tenant Resolution

`proxy.ts` executes within the Next.js application on the **Node.js runtime** as a lightweight request proxy/router:
1. **Hostname Extraction**: Inspects the incoming `Host` header (`shop.souqcloud.com` vs `app.souqcloud.com`).
2. **Dashboard Routing**: If hostname is `app.souqcloud.com`, rewrites internal path to `/(dashboard)/app/...`.
3. **Storefront Routing**: If hostname is a store subdomain or custom domain, resolves `store_id` using an in-memory/KV cache (avoiding runtime database lookups in proxy path) and injects `x-tenant-store-id: <uuid>`.
4. **Data Isolation**: Heavy database queries, user session validation, and authorization execute strictly in downstream Server Components and Server Actions.

---

## 4. Next.js Caching Semantics

* `revalidateTag(tag)`: Invalidates Server Component data cache across the cluster for subsequent requests.
* `updateTag(tag)`: Enforces read-your-writes freshness within the active request lifecycle.
* `revalidatePath(path)`: Clears client-side router cache for specific route segments.
