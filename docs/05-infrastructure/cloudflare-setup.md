Document: Cloudflare Setup
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-09-21
Depth: Full Spec
Dependencies: docs/01-architecture/architecture-overview.md, docs/05-infrastructure/deployment.md
Related Documents: docs/01-architecture/decisions/ADR-006-hosting-and-runtime-architecture.md, docs/03-modules/custom-domains.md, docs/05-infrastructure/media-storage.md
Decisions: ADR-002 (Multi-tenancy & Edge Routing), ADR-006 (Cloudflare Workers Hosting & Runtime Architecture)
Open Questions: None

---

## 1. Overview & Edge Network Architecture

Cloudflare serves as both the global edge network and the primary application compute platform for SOUQCLOUD. Incoming traffic is processed across Cloudflare's global edge network and intercepted by the primary Worker route to execute the SOUQCLOUD Worker in the Cloudflare Workers runtime (`workerd`).

```
Shopper / Merchant Browser
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Global Anycast Edge Network & Worker Routing      │
│                                                             │
│ • Apex Domain: souqcloud.com (Marketing & Public Pages)     │
│ • Subdomain: app.souqcloud.com (Merchant Dashboard)         │
│ • Wildcard Storefronts: *.souqcloud.com                     │
│ • Custom Hostnames (Cloudflare for SaaS): shop.brand.com     │
│ • Edge Caching & Tag-based Cache Invalidation               │
│ • Platform CNAME Target (Intended): cname.souqcloud.com     │
│ • Primary Intended Worker Route: */*                        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ SOUQCLOUD Worker (Cloudflare Workers runtime: workerd)      │
│ • Next.js 16 App Router (deployed through OpenNext)         │
│ • proxy.ts: Edge tenant-host extraction & route rewriting   │
│ • Downstream Supabase RPC & External Service integration    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. DNS & Zone Configuration

The primary zone `souqcloud.com` is configured with proxied DNS records intended to be intercepted by Cloudflare Worker routes prior to origin resolution:

| Record Type | Hostname / Pattern | Target / Configuration | Proxy Status | Description & Routing |
|---|---|---|---|---|
| `A` / `CNAME` | `souqcloud.com` | Proxied Edge Record (`100::` / apex target) | Proxied (Orange Cloud) | Marketing site & apex routing, intercepted by primary Worker Route |
| `CNAME` | `app.souqcloud.com` | Proxied Edge Record (`souqcloud.com`) | Proxied (Orange Cloud) | Merchant dashboard application, intercepted by primary Worker Route |
| `CNAME` | `*.souqcloud.com` | Proxied Edge Record (`souqcloud.com`) | Proxied (Orange Cloud) | Platform tenant subdomains, intercepted by primary Worker Route |
| `CNAME` | `cname.souqcloud.com` | Proxied Edge Record | Proxied (Orange Cloud) | Intended Platform CNAME Target for custom domains (fallback origin configured separately in SaaS settings) |
| `CNAME` | `media.souqcloud.com` | Cloudflare R2 Bucket Endpoint | Proxied (Orange Cloud) | Public media asset CDN delivery |

### SSL/TLS Configuration:
- **Encryption Mode**: Full (Strict).
- **Minimum TLS Version**: TLS 1.2 (TLS 1.3 enabled).
- **HSTS**: Enabled (max-age 31536000, include subdomains).

---

## 3. Cloudflare for SaaS (Custom Hostnames Architecture)

For merchants connecting their own custom domains (e.g. `shop.brand.com`), SOUQCLOUD integrates with **Cloudflare for SaaS (Custom Hostnames API v4)**.

### Architectural Entity Separation & Request Flow:

To maintain operational and architectural clarity, the following entities are strictly distinguished:
1. **Customer Custom Hostname**: The merchant's domain (e.g. `shop.brand.com`).
2. **Customer DNS CNAME**: The DNS record configured in the merchant's DNS provider pointing their domain to the Platform CNAME Target (`shop.brand.com CNAME cname.souqcloud.com`).
3. **Platform CNAME Target**: The customer-facing hostname target (`cname.souqcloud.com`) designated by the platform and published in merchant onboarding instructions.
4. **SaaS Zone**: The primary platform zone (`souqcloud.com`) hosting Cloudflare for SaaS.
5. **Fallback Origin**: A dedicated fallback-origin DNS record/hostname configured according to the Cloudflare Worker-as-fallback-origin setup before production activation. In application code, `CLOUDFLARE_FALLBACK_ORIGIN || 'cname.souqcloud.com'` functions as the current application default, but does not dictate the final production fallback origin hostname.
6. **Worker Route**: The primary intended production Worker Route is `*/*` (route-all-traffic configuration). Cloudflare documentation specifies that a wildcard Worker route `*/*` on the SaaS zone captures all incoming traffic—including platform subdomains and custom hostnames—intercepting requests before origin resolution. Selective route patterns (`souqcloud.com/*`, `*.souqcloud.com/*`) remain available if differentiated routing or exclusions are required later. (Note: Worker routes are target Cloudflare infrastructure configurations and are not declared in `wrangler.jsonc`).
7. **SOUQCLOUD Worker**: The serverless application compute artifact (`.open-next/worker.js`) executing within the `workerd` runtime.

```text
Customer Custom Hostname (e.g. shop.brand.com)
          │
          ▼ (Customer DNS CNAME)
Platform CNAME Target (cname.souqcloud.com)
          │
          ▼ (Cloudflare for SaaS Edge Processing)
SaaS Zone (souqcloud.com)
          │
          ▼ (Primary Worker Route Interception: */*)
SOUQCLOUD Worker (Cloudflare Workers runtime: workerd)
          │
          ▼ (OpenNext build output: Next.js 16 App Router)
Downstream Supabase & External Services
          │
[ Note: Fallback-origin configuration is a required SaaS-zone element, but matching requests execute in the Worker before origin resolution ]
```

> [!IMPORTANT]
> The Worker serves as the application origin for SaaS traffic through the Worker Route. The Cloudflare for SaaS fallback-origin configuration remains a required SaaS-zone configuration element, but requests handled by the matching Worker Route are processed by the Worker before origin resolution. The CNAME Target and Fallback Origin are DNS and Cloudflare for SaaS configuration entities; they are **not** Worker scripts or application containers.

### Custom Hostname Lifecycle:
1. **Creation**: When a merchant submits `shop.brand.com`, SOUQCLOUD calls Cloudflare API `POST /zones/:zone_id/custom_hostnames` using HTTP DCV validation.
2. **DNS Challenges**: Cloudflare returns TXT ownership challenge (`_cf-custom-hostname.shop.brand.com`) and SSL validation CNAME challenge.
3. **Verification**: SOUQCLOUD polls `GET /zones/:zone_id/custom_hostnames/:id` until ownership status is `active` and SSL status is `active`.
4. **Traffic Routing**: Merchant configures `CNAME shop.brand.com -> cname.souqcloud.com`. Traffic routes through Cloudflare edge, is recognized as an active custom hostname on the SaaS zone, and is intercepted by the Worker Route (`*/*`) to the SOUQCLOUD Worker with the original `Host: shop.brand.com` preserved for downstream tenant resolution.

---

## 4. Configuration Status & Verification Matrix (Actual vs Target)

To prevent discrepancies between verified implementation and intended infrastructure configuration, the Cloudflare topology is classified as follows:

| Category | Component / Setting | Implementation & Verification Status |
|---|---|---|
| **ACTUAL VERIFIED** | OpenNext Worker Artifact | `.open-next/worker.js` and `.open-next/assets` build output verified in CI |
| **ACTUAL VERIFIED** | `workerd` Runtime Execution | Local & CI Linux execution verified via Wrangler/Miniflare (`tests/worker-smoke-tests.mjs`) |
| **ACTUAL VERIFIED** | Wrangler Deployment Contract | `wrangler.jsonc` defining `main`, `compatibility_flags: ["nodejs_compat"]`, and `assets` |
| **ACTUAL VERIFIED** | Application Runtime Integration | Host parsing, header sanitization, and routing logic in `src/proxy.ts` |
| **IMPLEMENTED (UNVERIFIED)** | Custom Hostname API Integration | `CloudflareCustomHostnameClient` in `src/lib/domains/cloudflare-adapter.ts` (pending quota code 1404) |
| **IMPLEMENTED (UNVERIFIED)** | Custom Hostname SSL/DCV Logic | TXT and HTTP verification record handling implemented in domain service |
| **TARGET / INTENDED** | Primary Worker Route (`*/*`) | Primary route-all-traffic configuration on SaaS zone (selective patterns `souqcloud.com/*`, `*.souqcloud.com/*` available if exclusions needed) |
| **TARGET / INTENDED** | Cloudflare for SaaS Activation | Allocation of custom hostname quota on `souqcloud.com` zone |
| **TARGET / INTENDED** | Fallback-Origin SaaS Configuration | A dedicated fallback-origin DNS record/hostname configured according to the Cloudflare Worker-as-fallback-origin setup |
| **TARGET / INTENDED** | Production CNAME Target Wiring | Final publication and active routing of `cname.souqcloud.com` in production DNS |

---

## 5. Edge Cache Invalidation & Purge API

SOUQCLOUD leverages Cache-Tag based edge caching for published storefront assets and pages. When a merchant publishes updates to products, themes, or pages, SOUQCLOUD triggers an edge cache purge:

- **Purge Method**: `POST /zones/:zone_id/purge_cache` with `tags: ["store_<store_id>"]`.
- **Graceful Fallback**: If purge API tokens are not configured in development, the system logs a notice and continues without throwing an unhandled exception.

---

## 6. API Token Permissions & Security Boundaries

To maintain strict least-privilege security separation, SOUQCLOUD requires two separate Cloudflare API tokens:

### 1. Edge Cache Purge API Token (`CLOUDFLARE_PURGE_API_TOKEN`):
- **Purpose**: Strictly dedicated to edge cache tag and URL invalidation.
- **Required Permission**: `Zone.Cache Purge: Purge`
- **Zone Scope**: Restricted to `souqcloud.com` zone only.

### 2. Cloudflare for SaaS Custom Hostnames Token (`CLOUDFLARE_API_TOKEN`):
- **Purpose**: Strictly dedicated to managing custom hostnames and SSL validation.
- **Required Permissions**:
  - `Zone.Custom Hostnames: Edit`
  - `Zone.SSL and Certificates: Edit`
  - `Zone.Zone Settings: Read`
- **Zone Scope**: Restricted to `souqcloud.com` zone only.
- **Security Boundary**: This token must never have Account-level administrative permissions or access to DNS zones outside `souqcloud.com`.

---

## 7. Environment Configuration Contract

The following environment variables govern the Cloudflare integration:

| Environment Variable | Scope | Required? | Description |
|---|---|---|---|
| `CLOUDFLARE_ZONE_ID` | Server | Optional (Dev) / Required (Prod) | Cloudflare Zone ID for `souqcloud.com` |
| `CLOUDFLARE_PURGE_API_TOKEN` | Server | Optional | API token restricted to `Zone.Cache Purge: Purge` |
| `CLOUDFLARE_API_TOKEN` | Server | Optional | API token restricted to `Zone.Custom Hostnames: Edit` |
| `CLOUDFLARE_FALLBACK_ORIGIN` | Server | Optional | Fallback origin hostname / current application default (`cname.souqcloud.com`) |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Server | Optional | Cloudflare Account ID for R2 storage |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Server | Optional | S3-compatible Access Key ID for R2 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Server | Optional | S3-compatible Secret Access Key for R2 |
| `CLOUDFLARE_R2_BUCKET_NAME` | Server | Optional | Primary R2 storage bucket name |
| `CLOUDFLARE_R2_PUBLIC_DOMAIN` | Server | Optional | Public CDN domain for media delivery |
