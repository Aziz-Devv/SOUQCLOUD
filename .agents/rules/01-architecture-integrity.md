# SOUQCLOUD — Architecture Integrity

The approved architecture in @docs/01-architecture/ is a constraint, not a suggestion.

## Core Principles
- Preserve documented system boundaries; prefer existing abstractions over new ones.
- Keep platform billing (Merchant → Paddle → Platform Subscription) strictly separate from
  storefront commerce (Customer → Cart → Order → Dashboard/WhatsApp/Both).
- Maintain multi-tenant isolation at every layer (database, API, rendering).

## Multi-Tenancy & Ownership
The approved identity hierarchy is: Auth Identity → User → Membership → Merchant/Organization
→ Store. Full detail: @docs/01-architecture/identity-and-membership-model.md

Ownership scope is NOT uniform. Do not assume every table is store-scoped — some are
organization-scoped. The authoritative scoping rules are in
@docs/01-architecture/architecture-rules.md. Never allow a cross-tenant reference.

## Runtime Boundary
Approved topology: Cloudflare Edge (DNS/TLS/WAF/CDN) → Next.js Application → `proxy.ts`
(Node.js runtime, lightweight request-boundary concerns only) → Server Components / Server
Actions / Route Handlers → Supabase / PostgreSQL.

`proxy.ts` is NOT Cloudflare Edge runtime code and is NOT the old Edge-runtime
`middleware.ts`. It runs on the Node.js runtime. Do not place business logic, authorization
logic, or heavy database work inside it.

## Architectural Changes Require Review
Any change affecting tenancy, database ownership, authorization, public/private boundaries,
payment/billing architecture, rendering architecture, API architecture, or infrastructure
topology must follow @.agents/rules/06-change-management.md before implementation begins.
