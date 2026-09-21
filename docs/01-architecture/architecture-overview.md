Document: Architecture Overview
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-09-18
Depth: Full Spec
Dependencies: docs/00-product/product-vision.md, docs/00-product/phase-1-scope.md
Related Documents: docs/01-architecture/architecture-rules.md, docs/01-architecture/multi-tenancy.md, docs/01-architecture/identity-and-membership-model.md, docs/01-architecture/api-architecture.md, docs/01-architecture/decisions/ADR-006-hosting-and-runtime-architecture.md, docs/05-infrastructure/nextjs-structure.md
Decisions: Next.js 16 App Router application deployed through OpenNext to the Cloudflare Workers runtime (workerd) as primary production application hosting platform (ADR-006); proxy.ts on Cloudflare Worker runtime for edge tenant-host extraction and request routing; Cloudflare global edge and Worker routing; Supabase PostgreSQL with Grants & RLS; Order Submission & WhatsApp dispatch; Paddle Platform Subscription Billing.
Open Questions: None

# Architecture Overview

## 1. System Topology and High-Level Architecture

The platform unifies edge networking and application compute into Cloudflare Workers: incoming requests flow from Cloudflare Edge / Worker Route → SOUQCLOUD Worker → Next.js 16 application deployed through OpenNext → executes in Cloudflare Workers runtime (workerd), eliminating external application containers and communicating downstream with external data and service providers:

```
                      [ Client Requests (Shoppers & Merchants) ]
                                         │
                                         ▼
                 [ Cloudflare Global Edge & Worker Routing ]
                    - Wildcard DNS & SaaS Zone (*.souqcloud.com, Custom Hostnames)
                    - Universal SSL/TLS 1.3 Termination & WAF
                    - Global CDN Caching & Edge Cache Invalidation
                    - Worker Route Traffic Interception (prior to origin resolution)
                                         │
                                         ▼
                 [ SOUQCLOUD Worker (Cloudflare Workers runtime: workerd) ]
                    - Next.js 16 App Router (deployed through OpenNext)
                    - Isolate-based execution model (low startup overhead)
                    - proxy.ts: Edge tenant-host extraction & route rewriting
                    - React Server Components (RSC) streaming
                    - Server Actions & Route Handlers
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   [ Supabase Auth & PostgreSQL ]                  [ External Services Layer ]
   - Postgres Role Grants & RLS Policies           - Paddle (Platform SaaS Billing via Adapter)
   - Composite Foreign Key Integrity               - Cloudflare R2 (Presigned S3 Direct Upload)
   - Authoritative Tenant Resolution RPC           - WhatsApp API URL Generation
   - Storefront Orders & Snapshots                 
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
