Document: ADR-002: Multi-Tenancy and Tenant Resolution Strategy
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-09-18
Depth: Full Spec
Dependencies: docs/00-product/product-principles.md, docs/01-architecture/architecture-rules.md
Related Documents: docs/01-architecture/multi-tenancy.md, docs/01-architecture/decisions/ADR-006-hosting-and-runtime-architecture.md, docs/02-database/schema-overview.md
Decisions: Shared database with logical tenant isolation via PostgreSQL Row Level Security (RLS) & Composite Foreign Keys; hostname resolution via Next.js 16 proxy.ts on Node.js runtime fronted by Cloudflare Edge (Historical baseline; runtime context updated by ADR-006).
Open Questions: None

# ADR-002: Multi-Tenancy and Tenant Resolution Strategy

## Status
Proposed (Draft Master Specification)

## Context
Multi-tenant ecommerce platforms must balance data isolation, operational simplicity, cost efficiency, and low-latency request routing.

## Decision
We select a **Shared Database, Logical Tenant Partitioning** model powered by PostgreSQL Row Level Security (RLS), **Composite Foreign Key integrity**, and Next.js 16 `proxy.ts` tenant resolution on the Node.js runtime:
1. **Data Isolation**: Enforced via PostgreSQL RLS policies and composite foreign keys on all tenant tables (e.g. `(id, store_id)` composite constraints).
2. **Two-Tier Scoping**: Organization-level entities use `merchant_id`; retail commerce entities use `store_id`.
3. **Tenant Resolution via `proxy.ts`**: In Next.js 16, `proxy.ts` executes in the application's Node.js runtime, inspects the request `Host` header, performs lightweight cached tenant resolution, and injects `x-tenant-store-id` before downstream rendering.

## Consequences
### Positive
* High cost-efficiency and unified schema migration management.
* Cross-tenant data corruption is structurally impossible via composite foreign key enforcement.
* Ultra-fast request routing via cached hostname lookup without runtime database bottlenecks in the proxy path.

### Negative / Tradeoffs
* Shared database compute pool requires careful connection pooling (PgBouncer/Supavisor) and query indexing.

---

## Historical Addendum / Context Note (2026-09-18)
* **Runtime & Hosting Context Update**: The application hosting and runtime execution context for `proxy.ts` was subsequently updated from a Node.js server container to Cloudflare Workers (Next.js 16 application deployed through OpenNext to the Cloudflare Workers runtime / `workerd`) as codified in **[ADR-006](ADR-006-hosting-and-runtime-architecture.md)**.
* **Preservation of Tenancy Decision**: ADR-006 updates hosting and runtime topology only. The core tenancy decisions established in ADR-002—including two-tier scoping (`merchant_id` vs `store_id`), PostgreSQL Row Level Security (RLS), and structural composite foreign key constraints (`(id, store_id)`)—remain authoritative and unaltered.
