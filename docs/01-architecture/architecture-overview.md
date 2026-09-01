Document: Architecture Overview
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-vision.md, docs/00-product/phase-1-scope.md
Related Documents: docs/01-architecture/architecture-rules.md, docs/01-architecture/multi-tenancy.md, docs/01-architecture/identity-and-membership-model.md, docs/01-architecture/api-architecture.md, docs/05-infrastructure/nextjs-structure.md
Decisions: Next.js 16 App Router on Node.js container runtime with proxy.ts; Cloudflare Edge (DNS, TLS/SSL, WAF, CDN caching); Supabase PostgreSQL with Grants & RLS; Order Submission & WhatsApp dispatch; Paddle Platform Subscription Billing.
Open Questions: None

# Architecture Overview

## 1. System Topology and High-Level Architecture

The platform operates across a tiered runtime boundary separating global edge caching/security from the core Next.js Node.js application and Supabase data layer:

```
                      [ Client Requests (Shoppers & Merchants) ]
                                         │
                                         ▼
                         [ Cloudflare Edge / CDN / DNS ]
                    - Wildcard DNS Routing (*.souqcloud.com)
                    - Universal SSL/TLS Termination & WAF
                    - Global CDN Caching & Edge Cache Purge
                                         │
                                         ▼
                         [ Next.js 16 Application Runtime ]
                    - App Router (Node.js Container Runtime)
                    - proxy.ts (Lightweight Tenant Routing on Node.js)
                    - React Server Components (RSC) by default
                    - Server Actions & Route Handlers
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   [ Supabase Auth & PostgreSQL ]                  [ External Services Layer ]
   - Postgres Role Grants & RLS Policies           - Paddle (Platform SaaS Billing)
   - Composite Foreign Key Integrity               - Cloudflare R2 (Media Storage)
   - Storefront Orders & Snapshots                 - WhatsApp API URL Generation
   - Merchant Order Lifecycle (NEW -> DELIVERED)
```

---

## 2. Core Architectural Subsystems

### 2.1 Storefront Order Submission & Multi-Channel Outcomes
* **Flow**: Shopper adds items to Cart &rarr; enters contact/delivery details &rarr; submits Order.
* **Server Precedence**: The server validates the order and creates the canonical `public.orders` and `public.order_line_items` records in PostgreSQL before generating client responses.
* **Store Order Modes**:
  * `DASHBOARD`: Web confirmation receipt &rarr; order managed in merchant Dashboard.
  * `WHATSAPP`: Server compiles formatted order text &rarr; redirects shopper to merchant WhatsApp number.
  * `BOTH`: Web confirmation receipt with direct WhatsApp redirect action + Dashboard visibility.

### 2.2 Platform Subscription Billing (Paddle)
* **Flow**: `Merchant → Platform` subscription payments are managed independently via **Paddle** through the `BillingProviderAdapter` interface. Storefront customer orders do not interact with the billing infrastructure.

### 2.3 Object Storage Layer (Cloudflare R2)
* **Media Assets**: Presigned direct browser uploads, partitioned into public storefront media (CDN) and private merchant assets (signed URLs).
