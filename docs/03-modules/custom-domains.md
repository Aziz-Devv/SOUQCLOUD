Document: Module: Custom Domains
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/roadmap.md, docs/05-infrastructure/cloudflare-setup.md, docs/01-architecture/decisions/ADR-002-multi-tenancy-and-tenant-resolution.md, docs/01-architecture/identity-and-membership-model.md
Related Documents: docs/03-modules/storefront-rendering.md, docs/03-modules/store-creation.md, docs/04-ux-ui/dashboard-ux.md
Decisions: Custom Hostnames provisioned via Cloudflare for SaaS API v4; public.custom_domains is operational ledger; public.stores.custom_domain is active routing projection; subdomains and www supported in Phase 2; apex domains require www or CNAME flattening; strictly on-demand verification polling without background workers.
Open Questions: None

# Module Specification: Custom Domains

## 1. Purpose & Strategic Scope
The Custom Domains module enables merchants to connect their own custom domains (e.g. `shop.alreem.com`, `www.fashionbrand.sa`) to their SOUQCLOUD storefront. It automates DNS ownership verification and SSL/TLS certificate provisioning via Cloudflare for SaaS, allowing stores to be accessed directly under branded URLs while preserving full multi-tenant isolation and edge routing performance.

---

## 2. Domain Scope & Supported Domain Types (Phase 2)
1. **Standard Subdomains (Phase 2 Supported)**: e.g. `shop.brand.com`, `store.brand.sa`, `buy.brand.co.uk`. Configured with a `CNAME` record to `cname.souqcloud.com` and a `TXT` ownership verification record.
2. **WWW Subdomains (Phase 2 Supported)**: e.g. `www.brand.com`. Configured with a `CNAME` record to `cname.souqcloud.com` and a `TXT` ownership verification record.
3. **Naked Apex Domains (Phase 2 Non-Goal / Out of Scope)**: e.g. `brand.com` without subdomain. Because DNS RFC 1034 prohibits standard CNAME records on zone apexes, merchants connecting apex domains are instructed in Phase 2 to use `www.brand.com` as their primary custom domain with a root-to-www redirect at their registrar, or utilize DNS providers with CNAME flattening / ALIAS records.

---

## 3. Data Model References & State Machines

### 3.1 Data Model Architecture
* **`public.custom_domains` (Authoritative Operational Ledger)**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE`
  - `hostname VARCHAR(255) NOT NULL UNIQUE`
  - `status public.custom_domain_status NOT NULL DEFAULT 'PENDING_VERIFICATION'`
  - `ssl_status public.custom_domain_ssl_status NOT NULL DEFAULT 'INITIALIZING'`
  - `cloudflare_custom_hostname_id VARCHAR(255) NULL`
  - `verification_txt_name VARCHAR(255) NULL`
  - `verification_txt_value VARCHAR(255) NULL`
  - `cname_target VARCHAR(255) NOT NULL`
  - `last_checked_at TIMESTAMPTZ NULL`
  - `verified_at TIMESTAMPTZ NULL`
  - `error_message TEXT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
* **`public.stores.custom_domain` (Fast Routing Projection)**:
  - **Synchronization Invariant**: `stores.custom_domain = custom_domains.hostname` IF AND ONLY IF `custom_domains.status = 'ACTIVE'`.
  - In all other states (`PENDING_VERIFICATION`, `FAILED`, `SUSPENDED`, or upon deletion), `stores.custom_domain` MUST BE `NULL`.
* **Single Source of Truth for Routing Authority**: The public resolution RPC `resolve_store_by_custom_domain(hostname)` evaluates `public.custom_domains` joined with `public.stores` to guarantee that traffic only routes when `custom_domains.status = 'ACTIVE'` and `stores.status = 'PUBLISHED'`.

### 3.2 Domain State Machine (`custom_domain_status`)
```text
[ PENDING_VERIFICATION ] ──(Cloudflare reports active + SSL active)──► [ ACTIVE ]
          │                                                                │
          ├─(Validation timeout / DNS mismatch)──► [ FAILED ]              │
          │                                           │ (Re-verify action) │
          │                                           └────────────────────┤
          │                                                                ▼
          └────────────────────────────────────────────────────────► [ DELETED ]
```

* **`PENDING_VERIFICATION`**: Domain registered in system; TXT and CNAME verification challenge records generated and displayed to merchant.
* **`ACTIVE`**: Cloudflare confirms hostname ownership and SSL certificate issuance. Domain actively routes storefront traffic.
* **`FAILED`**: DNS challenge failed or validation timed out. Merchant can view diagnostic error and trigger re-verification.
* **`SUSPENDED`**: Temporarily disabled by operator or when parent store is in `MAINTENANCE` / `ARCHIVED` status (`stores.custom_domain = NULL`).

### 3.3 SSL Certificate Lifecycle (`custom_domain_ssl_status`)
* **`INITIALIZING`**: Certificate order placed with certificate authority via Cloudflare.
* **`PENDING_VALIDATION`**: Awaiting domain control validation (DCV) challenge propagation.
* **`ACTIVE`**: Certificate issued, deployed at Cloudflare edge, and serving HTTPS.
* **`FAILED`**: Certificate issuance failed (e.g. CAA restriction or challenge mismatch).

---

## 4. Business Rules & Security Invariants

1. **Anti-Hijacking & Reserved Domains**:
   - Platform strictly forbids registering system apex domains (`souqcloud.com`), platform subdomains (`*.souqcloud.com`, `app.*`, `admin.*`, `api.*`), and local dev hosts (`localhost`, `127.0.0.1`).
   - Cross-store uniqueness enforced via `UNIQUE(hostname)`.
2. **Server-Side Authorization & Role Guards**:
   - Domain management (attaching, verifying, deleting) is restricted to active members with **`OWNER`** or **`ADMIN`** roles in `public.memberships`.
   - Members with **`STAFF`** role can view domain status but cannot perform mutations.
3. **Tamper-Proof Edge Proxy Routing**:
   - `src/proxy.ts` strictly strips all client-supplied `x-tenant-*` headers (`x-tenant-host`, `x-tenant-handle`, `x-tenant-store-id`).
   - `x-tenant-host` is derived exclusively from the trusted request `Host` header.
4. **On-Demand Polling Execution (No Background Queues)**:
   - Status checks and reconciliation execute on-demand when the merchant clicks "التحقق من حالة النطاق" (Check Status) in the Dashboard. No asynchronous background workers, queues, or cron jobs are used in Phase 2.

---

## 5. Cloudflare for SaaS Integration Boundary

* **Cloudflare API v4 Endpoints**:
  - `POST /client/v4/zones/:zone_id/custom_hostnames`: Creates custom hostname and initiates DV SSL order.
  - `GET /client/v4/zones/:zone_id/custom_hostnames/:custom_hostname_id`: Queries live verification and SSL status.
  - `DELETE /client/v4/zones/:zone_id/custom_hostnames/:custom_hostname_id`: Releases custom hostname and revokes SSL cert.
* **Adapter Interface (`CustomHostnameAdapter`)**:
  - `CloudflareCustomHostnameClient`: Production adapter communicating with Cloudflare API v4 using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID`.
  - `MockCustomHostnameAdapter`: Deterministic mock adapter for local development, CI/CD, and test suites when live credentials are not present.
* **Environment Configuration Contract**:
  - `CLOUDFLARE_ZONE_ID`: Zone identifier for `souqcloud.com`.
  - `CLOUDFLARE_API_TOKEN`: Dedicated Cloudflare API Token scoped to `Zone.Custom Hostnames: Edit` and `Zone.SSL and Certificates: Edit`.
  - `CLOUDFLARE_FALLBACK_ORIGIN`: Fallback origin CNAME target (defaults to `cname.souqcloud.com`).

---

## 6. API Contract & Server Actions

* `attachCustomDomain(storeId: string, hostname: string): Promise<ActionResult<CustomDomainDetail>>`
  - Validates FQDN, checks reserved names, calls Cloudflare API to register hostname, inserts `public.custom_domains` in `PENDING_VERIFICATION`.
* `verifyCustomDomain(storeId: string, domainId: string): Promise<ActionResult<CustomDomainDetail>>`
  - Queries Cloudflare API for current status; if active, updates `status = 'ACTIVE'` and syncs `stores.custom_domain = hostname`.
* `removeCustomDomain(storeId: string, domainId: string): Promise<ActionResult<void>>`
  - Calls Cloudflare API to delete hostname, deletes database record, and resets `stores.custom_domain = NULL`.
* `getCustomDomain(storeId: string): Promise<ActionResult<CustomDomainDetail | null>>`
  - Retrieves active custom domain and DNS instructions for the merchant dashboard.

---

## 7. UI/UX Reference (`/app/settings/domain`)

* **Interface (Arabic RTL)**:
  - **Subdomain Info Card**: Displays standard store URL `https://[handle].souqcloud.com`.
  - **Custom Domain Card**:
    - Input form for attaching new custom domain with real-time FQDN validation.
    - Status badge: 🟢 **نشط ومفعل** (Active), 🟡 **قيد التحقق** (Pending Verification), 🔴 **فشل التحقق** (Failed).
    - DNS Configuration Table:
      - `TXT` record: Name `_cf-custom-hostname.[domain]`, Value `[txt_value]` (with one-click copy button).
      - `CNAME` record: Name `[domain]`, Target `cname.souqcloud.com` (with one-click copy button).
    - Actions: `التحقق من حالة النطاق` (Re-check Status) and `إزالة النطاق` (Remove Domain).

---

## 8. Acceptance Criteria (Given / When / Then)

* **Given** an authenticated merchant with role `OWNER` or `ADMIN`, **When** attaching a valid custom domain `shop.brand.com`, **Then** a Cloudflare custom hostname is created, a `public.custom_domains` record is persisted with status `PENDING_VERIFICATION`, and the required TXT and CNAME DNS challenge values are returned.
* **Given** an attempt to attach a reserved domain (`souqcloud.com`, `app.souqcloud.com`, `localhost`) or an already registered domain, **Then** the action is rejected with `400 BAD REQUEST` / `DOMAIN_RESERVED_OR_ALREADY_EXISTS`.
* **Given** a domain in `PENDING_VERIFICATION` where the merchant has configured correct DNS records, **When** triggering `verifyCustomDomain`, **Then** the domain transitions to `ACTIVE`, `ssl_status` becomes `ACTIVE`, `stores.custom_domain` is updated to `shop.brand.com`, and subsequent storefront requests to `shop.brand.com` render the store catalog.
* **Given** an active custom domain, **When** the merchant removes the domain, **Then** the Cloudflare custom hostname is deleted, the database record is removed, `stores.custom_domain` is set to `NULL`, and storefront requests to that domain are safely rejected.
* **Given** a user with role `STAFF`, **When** attempting to attach, verify, or remove a custom domain, **Then** the action is rejected with `403 FORBIDDEN`.

---

## 9. Status
* **Status**: Full Spec / Approved for Implementation
