Document: Next.js Structure
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-09-21
Depth: Full Spec
Dependencies: docs/01-architecture/architecture-overview.md, docs/01-architecture/architecture-rules.md
Related Documents: docs/01-architecture/decisions/ADR-006-hosting-and-runtime-architecture.md, docs/03-modules/storefront-rendering.md, docs/03-modules/dashboard-shell.md, docs/05-infrastructure/cloudflare-setup.md
Decisions: Next.js 16 App Router application deployed through OpenNext to the Cloudflare Workers runtime (workerd) as primary production application hosting platform (ADR-006); proxy.ts executing on Cloudflare Workers for edge tenant-host extraction, header sanitization, and request routing; Cloudflare global edge and Worker routing; Supabase PostgreSQL with Grants & RLS; Paddle billing webhooks and storefront order endpoints.
Open Questions: None

# Next.js Application Structure & Runtime Strategy

## 1. Runtime Architecture & Deployment Boundary

The system unifies global edge networking and application compute into Cloudflare Workers: incoming requests flow from Cloudflare Edge / Worker Route → SOUQCLOUD Worker → Next.js 16 application deployed through OpenNext → executes in Cloudflare Workers runtime (workerd).

OpenNext functions as the deployment/build adapter compiling the Next.js 16 App Router application into a standalone Worker bundle (`.open-next/worker.js`) and static assets (`.open-next/assets`). Execution occurs within the Cloudflare Workers isolate-based runtime (`workerd`), eliminating external application servers or containers.

```text
Internet
   ↓
Cloudflare Global Edge & Worker Routing
   ├── DNS (Wildcard & Custom Hostnames via Cloudflare for SaaS)
   ├── TLS 1.3 / SSL Termination & WAF
   ├── Global CDN Caching & Edge Cache Invalidation
   └── Worker Route Traffic Interception
   ↓
SOUQCLOUD Worker (Cloudflare Workers runtime: workerd)
   ↓
proxy.ts (Edge tenant-host extraction, header sanitization, and route rewriting)
   ↓
Next.js 16 App Router (deployed through OpenNext build output)
   ├── React Server Components (RSC) Streaming
   ├── Server Actions
   └── API Route Handlers
   ↓
Supabase / PostgreSQL / External Services (R2, Paddle)
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
├── proxy.ts                        # Next.js 16 Network Proxy on Cloudflare Workers Runtime (Tenant Routing & Header Sanitization)
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

`proxy.ts` executes within the Next.js 16 application deployed through OpenNext to the **Cloudflare Workers runtime (workerd)** as a lightweight request proxy/router:
1. **Hostname Extraction & Header Sanitization**: Inspects incoming `Host` header (`shop.souqcloud.com` vs `app.souqcloud.com` vs `shop.brand.com`) and unconditionally strips untrusted client-supplied `x-tenant-*` headers to prevent header injection attacks.
2. **Dashboard Routing**: If hostname matches `app.souqcloud.com`, rewrites internal path to `/(dashboard)/app/...`.
3. **Storefront Routing & Internal Header Injection**: For store subdomains or custom domains, injects sanitized internal headers (`x-tenant-host` / `x-tenant-handle`) and rewrites internal path to `/(storefront)/...` without executing heavy runtime database lookups in the proxy path.
4. **Authoritative Tenant Resolution & Data Isolation**: Authoritative custom domain tenant resolution executes downstream via Supabase RPC (`public.resolve_store_by_custom_domain(hostname)`). Heavy database queries, user session validation, and authorization execute strictly in downstream Server Components and Server Actions.

---

## 4. Next.js Caching Semantics

* `revalidateTag(tag)`: Invalidates Server Component data cache across the cluster for subsequent requests.
* `updateTag(tag)`: Enforces read-your-writes freshness within the active request lifecycle.
* `revalidatePath(path)`: Clears client-side router cache for specific route segments.
