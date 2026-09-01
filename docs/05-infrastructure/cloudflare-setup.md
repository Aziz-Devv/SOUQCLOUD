Document: Cloudflare Setup
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/01-architecture/architecture-overview.md, docs/05-infrastructure/deployment.md
Related Documents: docs/03-modules/custom-domains.md, docs/05-infrastructure/media-storage.md
Decisions: ADR-002 (Multi-tenancy & Edge Routing)
Open Questions: None

---

## 1. Overview & Edge Network Architecture

Cloudflare serves as the primary edge entry point and CDN layer for SOUQCLOUD. It provides edge routing, TLS termination, DDoS protection, edge caching, and Cloudflare for SaaS (SSL for SaaS) custom hostname orchestration.

```
Shopper / Merchant Browser
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Global Anycast Edge Network                      │
│                                                             │
│ • Apex Domain: souqcloud.com (Marketing & Public Pages)     │
│ • Subdomain: app.souqcloud.com (Merchant Dashboard)         │
│ • Wildcard Storefronts: *.souqcloud.com                     │
│ • Custom Hostnames (Cloudflare for SaaS): shop.brand.com     │
│ • Edge Caching & Instant Tag-based Cache Invalidation       │
│ • Fallback Origin: cname.souqcloud.com                      │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ SOUQCLOUD Application Runtime                               │
│ (Next.js 16 App Router)                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. DNS & Zone Configuration

The primary zone `souqcloud.com` is configured with the following baseline DNS and SSL settings:

| Record Type | Hostname / Pattern | Target / Value | Proxy Status | Description |
|---|---|---|---|---|
| `A` / `CNAME` | `souqcloud.com` | Origin Ingress / Container Host | Proxied (Orange Cloud) | Marketing site and apex routing |
| `CNAME` | `app.souqcloud.com` | Origin Ingress / Container Host | Proxied (Orange Cloud) | Merchant dashboard application |
| `CNAME` | `*.souqcloud.com` | Origin Ingress / Container Host | Proxied (Orange Cloud) | Platform-provided tenant subdomains |
| `CNAME` | `cname.souqcloud.com` | Origin Ingress / Fallback Target | Proxied (Orange Cloud) | Cloudflare for SaaS Fallback Origin |
| `CNAME` | `media.souqcloud.com` | Cloudflare R2 Bucket Endpoint | Proxied (Orange Cloud) | Public media asset CDN distribution |

### SSL/TLS Configuration:
- **Encryption Mode**: Full (Strict).
- **Minimum TLS Version**: TLS 1.2 (TLS 1.3 enabled).
- **HSTS**: Enabled (max-age 31536000, include subdomains).

---

## 3. Cloudflare for SaaS (Custom Hostnames)

For merchants connecting their own custom domains (e.g. `shop.brand.com`), SOUQCLOUD integrates with **Cloudflare for SaaS (Custom Hostnames API v4)**.

### Custom Hostname Lifecycle:
1. **Creation**: When a merchant submits `shop.brand.com`, SOUQCLOUD calls Cloudflare API `POST /zones/:zone_id/custom_hostnames` using HTTP DCV validation.
2. **DNS Challenges**: Cloudflare returns TXT ownership challenge (`_cf-custom-hostname.shop.brand.com`) and SSL validation CNAME challenge.
3. **Verification**: SOUQCLOUD polls `GET /zones/:zone_id/custom_hostnames/:id` until ownership status is `active` and SSL status is `active`.
4. **Traffic Routing**: Merchant configures their DNS with `CNAME shop.brand.com -> cname.souqcloud.com`. Traffic routes through Cloudflare edge directly to SOUQCLOUD with the original `Host: shop.brand.com` header preserved.

---

## 4. Edge Cache Invalidation & Purge API

SOUQCLOUD leverages Cache-Tag based edge caching for published storefront assets and pages. When a merchant publishes updates to products, themes, or pages, SOUQCLOUD triggers an edge cache purge:

- **Purge Method**: `POST /zones/:zone_id/purge_cache` with `tags: ["store_<store_id>"]`.
- **Graceful Fallback**: If purge API tokens are not configured in development, the system logs a notice and continues without throwing an unhandled exception.

---

## 5. API Token Permissions & Security Boundaries

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

## 6. Environment Configuration Contract

The following environment variables govern the Cloudflare integration:

| Environment Variable | Scope | Required? | Description |
|---|---|---|---|
| `CLOUDFLARE_ZONE_ID` | Server | Optional (Dev) / Required (Prod) | Cloudflare Zone ID for `souqcloud.com` |
| `CLOUDFLARE_PURGE_API_TOKEN` | Server | Optional | API token restricted to `Zone.Cache Purge: Purge` |
| `CLOUDFLARE_API_TOKEN` | Server | Optional | API token restricted to `Zone.Custom Hostnames: Edit` |
| `CLOUDFLARE_FALLBACK_ORIGIN` | Server | Optional | Fallback origin hostname (`cname.souqcloud.com`) |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Server | Optional | Cloudflare Account ID for R2 storage |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Server | Optional | S3-compatible Access Key ID for R2 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Server | Optional | S3-compatible Secret Access Key for R2 |
| `CLOUDFLARE_R2_BUCKET_NAME` | Server | Optional | Primary R2 storage bucket name |
| `CLOUDFLARE_R2_PUBLIC_DOMAIN` | Server | Optional | Public CDN domain for media delivery |
