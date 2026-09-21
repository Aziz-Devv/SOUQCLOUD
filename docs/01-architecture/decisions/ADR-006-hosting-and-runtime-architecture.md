Document: ADR-006: Hosting and Runtime Architecture (Cloudflare Workers & OpenNext)
Version: 1.0
Status: Approved
Owner: Aziz
Last Updated: 2026-09-18
Depth: Full Spec
Dependencies: docs/00-product/roadmap.md, docs/01-architecture/architecture-overview.md, docs/01-architecture/architecture-rules.md, docs/01-architecture/decisions/ADR-002-multi-tenancy-and-tenant-resolution.md
Related Documents: docs/05-infrastructure/nextjs-structure.md, docs/05-infrastructure/cloudflare-setup.md, docs/05-infrastructure/deployment.md, docs/03-modules/storefront-rendering.md, docs/03-modules/custom-domains.md
Decisions: The Next.js 16 application deployed through OpenNext to the Cloudflare Workers runtime (workerd) is adopted as the primary production application hosting and runtime platform; proxy.ts executes within the Cloudflare Worker isolate; tenant-host extraction, validation, and request routing execute at the edge; authoritative tenant resolution remains performed through the Supabase resolution boundary; Supabase, Cloudflare R2, and Paddle remain decoupled external dependencies; ADR-006 changes hosting and runtime topology only, leaving domain, database, and business logic contracts intact.
Open Questions: None

# ADR-006: Hosting and Runtime Architecture (Cloudflare Workers & OpenNext)

## 1. Status
Approved (Authoritative Master Architecture Specification)

## 2. Context & Problem Statement
SOUQCLOUD was originally specified in the baseline Master Documentation with a traditional tiered hosting boundary:
```text
Internet ──► Cloudflare Edge (Reverse Proxy / CDN / WAF) ──► Node.js Container Runtime (Origin Host) ──► Supabase / Services
```

Under that baseline specification, the Next.js 16 App Router application and its network proxy (`src/proxy.ts`) were presumed to run inside a conventional Node.js server container (such as Docker on AWS ECS, Fly.io, or Render), with Cloudflare functioning strictly as an external reverse proxy, edge cache, DNS, and SSL for SaaS provider.

However, operating a separate Node.js container fleet introduces:
1. Operational complexity and infrastructure overhead associated with provisioning, patching, scaling, and monitoring container clusters.
2. Latency penalties caused by multi-hop routing between Cloudflare's Anycast edge network and a regionally pinned container origin.
3. Dual-tier maintenance where caching, routing rules, and SSL termination are split across two disparate operational platforms.

Recent empirical engineering evaluations on Linux demonstrated that the core Next.js 16 App Router application—including React Server Components (RSC), Route Handlers, header sanitization in `src/proxy.ts`, Supabase HTTPS client communication, and cryptographic signing for R2 and Paddle—can be compiled via OpenNext and executed reliably on the Linux `workerd` runtime.

We must formally evaluate, decide upon, and codify the platform hosting runtime model to reconcile our Master Documentation with reality and preserve the documentation-first workflow.

---

## 3. Decision
We officially establish that the **Next.js 16 application deployed through OpenNext to the Cloudflare Workers runtime (workerd)** is the **primary production application hosting and runtime platform** for SOUQCLOUD.

### Key Tenets of this Decision:
1. **Primary Application Hosting Platform**:
   Cloudflare Workers is adopted as the primary compute and hosting platform for the web application tier. Cloudflare's Anycast edge network and application compute tier are unified into a single global edge runtime.
2. **Execution Model**:
   The application operates under an **isolate-based execution model** (running on Cloudflare's `workerd` engine). This provides low startup overhead, efficient concurrency, and eliminates the operational burden of managing persistent application servers or container fleets.
3. **Decoupled External Infrastructure Boundaries**:
   Adopting Cloudflare Workers as the application runtime does **not** make Workers the sole infrastructure of SOUQCLOUD. External services remain strictly decoupled outside the runtime:
   - **Database & Auth**: Managed by **Supabase** (PostgreSQL, Supabase Auth, PgBouncer/Supavisor, PostgREST).
   - **Object Storage**: Managed by **Cloudflare R2** via direct browser-to-R2 presigned S3 URLs.
   - **Platform Billing**: Managed by **Paddle** via provider adapter abstraction for platform subscription billing (real sandbox notification destination and webhook lifecycle configuration currently deferred by product decision; merchant customer online payments remain a separate Phase 3+ capability).
4. **Scope of Invariants**:
   **ADR-006 updates hosting and runtime topology only.** It does **NOT** alter application business logic, domain models, database schemas, Row Level Security (RLS) policies, composite foreign key invariants, or API contracts.

---

## 4. Evaluation of Runtime Compilation Paths: OpenNext vs. vinext

### 4.1 Recognition of Cloudflare's Current Baseline
Cloudflare's current official documentation highlights and recommends `vinext` as a current/default path for new Next.js deployments on Cloudflare Workers. We recognize and acknowledge this recommendation.

### 4.2 SOUQCLOUD Evaluation of vinext
SOUQCLOUD evaluated `vinext` against our active codebase and build requirements:
- `vinext` relies on an alternative Vite-based bundling mechanism for Next.js features that introduced friction with existing Next.js 16 App Router internals, Turbopack configurations, and specific workspace dependencies.
- Consequently, `vinext` was not adopted for SOUQCLOUD after direct project build and dependency evaluation.

### 4.3 Deliberate Selection of OpenNext
OpenNext (`@opennextjs/cloudflare`) was selected through a deliberate, project-specific engineering decision because:
1. **Preservation of Next.js Architecture**: OpenNext takes standard Next.js 16 production build output (`.next`) and transforms it into a compliant Cloudflare Worker bundle (`.open-next/worker.js`), preserving the native App Router conventions, React Server Component streaming, Server Actions, and Next.js caching semantics without altering application source code.
2. **Documented Supported Path**: OpenNext remains a documented, supported deployment path for existing applications where compatibility considerations justify retaining it.
3. **Empirical Linux workerd Validation**: OpenNext output was directly validated under automated Linux CI/CD pipelines executing native `workerd`.

This selection is an intentional, project-specific architecture decision for SOUQCLOUD, not a generic claim that OpenNext is the universal solution for all projects.

---

## 5. Detailed Architecture & Network Topology

```text
[ Shopper / Merchant Browser ]
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Cloudflare Global Anycast Network                                           │
│                                                                             │
│  ├── SaaS Zone: souqcloud.com (Zone Settings, Universal SSL/TLS, WAF)       │
│  ├── Custom Hostname: shop.brand.com (Provisioned via Cloudflare for SaaS)  │
│  ├── CNAME Target: cname.souqcloud.com (Merchant DNS target)                │
│  ├── Fallback Origin: Designated origin fallback for SaaS zone              │
│  └── Worker Route: Wildcard route (e.g. */*) intercepting traffic on zone   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
              (Intercepted prior to origin resolution)
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SOUQCLOUD Worker (workerd / Isolate-Based Execution Model)                  │
│                                                                             │
│  ├── src/proxy.ts (Edge Network Entrypoint)                                │
│  │     ├── Header Tampering Protection (Strips untrusted x-tenant-*)        │
│  │     ├── Hostname Extraction & Classification                             │
│  │     └── Route Rewriting (Storefront vs Dashboard vs Marketing)           │
│  │                                                                          │
│  └── Next.js 16 App Router (deployed through OpenNext)                      │
│        ├── React Server Components (RSC) Streaming                          │
│        ├── Server Actions (State Mutations)                                 │
│        └── API Route Handlers (JSON Endpoints)                              │
└───────────────┬─────────────────────────────┬───────────────────────────────┘
                │                             │
    HTTPS (PostgREST / Auth)        Cryptographic SigV4 Signing
                │                             │
                ▼                             ▼
┌──────────────────────────────┐ ┌────────────────────────────────────────────┐
│ Supabase PostgreSQL & Auth   │ │ Cloudflare R2 Storage                      │
│ - Role Grants & RLS Policies │ │ - Direct Browser PUT (Presigned URLs)      │
│ - Composite Foreign Keys     │ │ - Public Assets: media.souqcloud.com CDN   │
│ - resolve_store_by_custom_domain│ - Private Assets: Signed GET URLs         │
└──────────────────────────────┘ └────────────────────────────────────────────┘
```

### 5.1 Cloudflare for SaaS Architectural Routing Chain
The platform's custom domain routing follows an explicit multi-stage architecture:
```text
Customer Custom Hostname
  ──► CNAME Target
  ──► SaaS Zone
  ──► Worker Route
  ──► SOUQCLOUD Worker
```

To maintain alignment with Cloudflare documentation, the routing topology maintains clear separation between each architectural component:
1. **Customer Custom Hostname**: The merchant's branded domain (e.g. `shop.brand.com`) registered under the SaaS zone via the Cloudflare API v4.
2. **CNAME Target**: The customer-facing target hostname designated by the platform (in SOUQCLOUD, `cname.souqcloud.com` where applicable) to which the merchant points their DNS CNAME record. As documented by Cloudflare, the CNAME Target is a customer-facing target that can point to the Fallback Origin; it is not the Worker itself, and merchant DNS does not point directly to the Worker.
3. **SaaS Zone**: The primary Cloudflare zone (`souqcloud.com`) that hosts the core platform apex, dashboard subdomains, universal SSL/TLS certificates, and Cloudflare for SaaS configurations.
4. **Fallback Origin**: An independent architectural element configured within Cloudflare for SaaS as the designated fallback origin server or hostname for custom hostnames in the zone.
5. **Worker Route**: A zone-level routing pattern (such as `*/*`) configured on the SaaS zone. In accordance with Cloudflare documentation, a wildcard Worker Route on the SaaS zone can intercept incoming traffic—including traffic destined for Cloudflare for SaaS custom hostnames—**prior to origin resolution** (before requests proceed to the Fallback Origin).
6. **SOUQCLOUD Worker**: The Next.js 16 application executing within an isolate-based runtime on `workerd`, which receives the intercepted request with the original `Host` header intact.
7. **Worker Attachment Methods**: While Worker Routes represent the primary mechanism leveraged in this topology, Cloudflare also supports alternative binding mechanisms (such as Custom Domains bindings); our architecture utilizes zone routing to service primary platform domains and custom tenant hostnames uniformly.

---

## 6. Subsystem Integrations & Boundary Invariants

### 6.1 Custom Domains & Cloudflare for SaaS
- **Integration Boundary**: Custom domain provisioning logic (`docs/03-modules/custom-domains.md`) uses the Cloudflare API v4 (`/zones/:zone_id/custom_hostnames`) to register custom hostnames and track DCV / SSL status.
- **Operational Reality & Strict Classification**:
  - **Application/Runtime Integration**: Validated on Cloudflare Workers. `src/proxy.ts` safely parses the `Host` header, protects against client tampering, and forwards the hostname for tenant resolution via the `public.resolve_store_by_custom_domain` database function.
  - **Real Cloudflare for SaaS Custom Hostname Provisioning**: Remains **pending** because of an observed external quota/product activation limitation on the development Cloudflare zone. The runtime implementation targets the documented Cloudflare Custom Hostnames API v4 contract, with a MockCustomHostnameAdapter available when real provisioning is unavailable.
- **Data Model Stability**: The operational ledger (`public.custom_domains`), the synchronization invariant to `public.stores.custom_domain`, and the resolution RPC remain 100% unchanged.

### 6.2 Supabase PostgreSQL & Auth
- **Communication Protocol**: The Worker communicates with Supabase strictly over standard HTTPS (Port 443) using PostgREST and Supabase Auth REST endpoints.
- **Client Factory Separation**:
  - `createClient()` (`@supabase/ssr`): Standard merchant and shopper requests subject to PostgreSQL Role Grants and Row Level Security (RLS).
  - `createAdminClient()` (`@supabase/supabase-js`): Restricted strictly to backend operations requiring elevated privileges (such as billing webhook reconciliation), authenticated via `SUPABASE_SECRET_KEY`.
- **Invariants**: No schema modifications, no migration re-ordering, no RLS policy relaxation, and no change to the composite foreign key architecture (`(id, store_id)`).

### 6.3 Cloudflare R2 Object Storage
- **Direct Client Upload Pattern Preserved**:
  Media uploads follow the direct browser-to-R2 workflow defined in `docs/05-infrastructure/media-storage.md`.
  1. The browser requests an upload intent from the Worker via `POST /api/media/presigned-url`.
  2. The Worker computes an S3 SigV4 signature using `@aws-sdk/s3-request-presigner` and `@aws-sdk/client-s3` and returns a presigned URL.
  3. The browser performs a direct HTTP `PUT` to Cloudflare R2.
- **Non-Goal**: The Worker does **not** act as a binary upload proxy. Presigning in the Worker requires negligible compute, maintaining a lightweight isolate footprint.

### 6.4 Platform Subscription Billing (Paddle) vs. Storefront Payments
- **Strict Separation of Concerns**:
  - **Platform Subscription Billing (`Merchant → Platform`)**: Covered under Phase 1 scope. It uses **Paddle** as the SaaS billing provider via the decoupled `BillingProviderAdapter` abstraction codified in ADR-004.
  - **Merchant Customer Online Payments (`Customer → Merchant`)**: A completely separate capability deferred to **Phase 3+ Future Capability**. ADR-006 does not alter this roadmap boundary.
- **Explicit Webhook Deferral**: Real Paddle Sandbox Notification Destination setup and incoming live webhook traffic verification remain **deferred by product decision**. HMAC-SHA256 signature verification and idempotent state mutation logic (`process_paddle_billing_webhook`) are verified in automated test suites and ready for future production enablement without architectural alterations.

---

## 7. Security, Tenant Resolution, and `src/proxy.ts`

In accordance with Architecture Rule 8 and ADR-002:
1. **Entrypoint Security**:
   `src/proxy.ts` acts as the first line of defense inside the Worker isolate. It unconditionally deletes any incoming client-supplied headers prefixed with `x-tenant-` (`x-tenant-host`, `x-tenant-handle`, `x-tenant-store-id`) to prevent header injection attacks.
2. **Tenant Hostname Extraction**:
   The trusted `Host` header is extracted and sanitized. Subdomains (e.g. `shop.souqcloud.com`) and custom domains (e.g. `shop.brand.com`) are mapped to their corresponding internal route rewrites.
3. **Lightweight Edge Operation**:
   `proxy.ts` avoids complex database joins. For custom domains, it forwards the sanitized hostname via the internal `x-tenant-host` header to downstream Server Components, which query `public.resolve_store_by_custom_domain(hostname)` against Supabase.

---

## 8. Empirical Evidence from Linux workerd Validation

The viability of Next.js 16 deployed through OpenNext to the Cloudflare Workers runtime is backed by empirical verification executed in headless Linux (`ubuntu-latest`) environments:
1. **Full Build Pipeline**: `next build` followed by `open-next build` successfully generated `.open-next/worker.js` and `.open-next/assets/`.
2. **Native Runtime Instantiation**: The resulting worker bundle booted successfully in the native Linux `workerd` runtime (via Miniflare / Wrangler local simulation) on `127.0.0.1:8787`.
3. **Validated Execution Results**:
   - HTTP root status, layout, and HTML document generation confirmed.
   - Header tampering protection validated (untrusted `x-tenant-*` headers stripped).
   - Live HTTPS queries to Supabase executed successfully from within the Worker isolate.
   - Dynamic custom domain tenant resolution against live PostgreSQL confirmed.
   - Worker-side presigned URL generation and cryptographic S3 SigV4 signing logic was validated. (The intended architecture remains direct browser-to-R2 transfer after presigning; the Worker is not a binary upload proxy).
   - Paddle HMAC-SHA256 signature verification and replay defense validated.
4. **Explicit Validation Boundaries**:
   - **Server Actions**: Direct HTTP invocation of Server Actions was **not** independently validated in the completed Worker runtime proof, and is therefore not claimed as a verified test result. Server Actions remain an integral architectural component of Next.js 16 and will undergo verification during full application flow testing.

---

## 9. Operational & Deployment Model

1. **Build Process**:
   CI/CD runs `npx @opennextjs/cloudflare build`, generating the bundle in `.open-next/worker.js`.
2. **Deployment Command**:
   Releases are pushed to Cloudflare using `npx wrangler deploy`. Static assets are uploaded directly to Cloudflare Workers Static Assets.
3. **Environment Variables & Secrets**:
   - Public variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_ROOT_DOMAIN`) are declared in `wrangler.jsonc` or GitHub Actions environment variables.
   - Sensitive credentials (`SUPABASE_SECRET_KEY`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_ACCOUNT_ID`) are provisioned via Cloudflare Secrets (`wrangler secret put`), never committed to source control.

---

## 10. Consequences

### 10.1 Positive Consequences
- **Unified Global Infrastructure**: Application compute is co-located with Cloudflare's edge network, eliminating multi-hop proxy latencies between edge and origin containers.
- **Elimination of Container Maintenance**: Eliminates the operational overhead of managing, patching, and scaling an application container fleet, while compute consumption naturally aligns with the Workers execution model.
- **Low Startup Overhead**: Isolate-based execution avoids the heavy cold-start penalties characteristic of container provisioning.
- **Preserved Codebase**: No rewrite of business logic, React Server Components, Server Actions, or Supabase schemas was required.

### 10.2 Trade-offs & Limitations
- **Isolate Sandbox Constraints**: The application runs in a V8 isolate without access to native Node.js C++ bindings, persistent local file systems, or arbitrary long-running background daemon threads.
- **OpenNext Layer Dependency**: Changes in future Next.js minor/major versions require verification against OpenNext compatibility releases prior to upgrading.
- **Background Processing Boundary**: Long-running or resource-intensive background processing must use an explicitly approved asynchronous execution mechanism and must not block the synchronous Worker request lifecycle.

---

## 11. Non-Goals
- **Container Deployments**: SOUQCLOUD will not maintain or publish Docker containers for application hosting.
- **Direct Worker File Proxying**: Workers will not stream binary video or large media uploads directly through worker memory.
- **Customer Online Payments in Phase 1/2**: Customer storefront payments remain out of scope for Phase 1 and Phase 2, adhering strictly to the product roadmap.
- **Replacing Supabase with Edge Storage**: Supabase remains the authoritative relational database; Cloudflare KV / D1 are not used as primary transactional stores.

---

## 12. Documentation Reconciliation Scope

Following formal approval, this ADR establishes the authoritative hosting and runtime baseline. The following Master Documentation files constitute the target scope to be reconciled across subsequent phases, preserving all underlying domain, database, and security contracts:
- **`ADR-002: Multi-Tenancy and Tenant Resolution Strategy`**:
  Preserved in full as a historical decision record. ADR-002 established the shared database, logical RLS isolation, and two-tier hierarchy. An addendum note will record that ADR-006 updates the runtime execution environment of `proxy.ts` from a Node.js server to a Cloudflare Worker isolate.
- **`docs/01-architecture/architecture-overview.md`**:
  Target document for reconciliation to reflect the unified edge hosting topology and isolate-based execution model.
- **`docs/01-architecture/architecture-rules.md`**:
  Target document for reconciliation to update Rule 8, specifying that `proxy.ts` executes within the Cloudflare Worker runtime (`workerd`).
- **`docs/05-infrastructure/nextjs-structure.md`**:
  Target document for reconciliation to describe the OpenNext build output and `workerd` runtime boundary.
- **`docs/05-infrastructure/cloudflare-setup.md`**:
  Target document for reconciliation to align DNS tables and ingress architecture with Worker routes and Cloudflare for SaaS routing.
- **`docs/05-infrastructure/deployment.md`**:
  Target document for reconciliation to document OpenNext build and Wrangler deployment stages in the CI/CD pipeline.
- **`docs/03-modules/storefront-rendering.md`**:
  Target document for reconciliation to align runtime execution terminology with Cloudflare Workers.
- **`docs/06-process/PROJECT_STATE.md`**:
  Target document for reconciliation to record the adoption of ADR-006 and empirical runtime validation as an accomplished milestone.
- **`docs/MASTER_DOCUMENTATION_TOC.md` & `docs/README.md`**:
  Target registry documents to register ADR-006 in the Master Architecture index and project map.
