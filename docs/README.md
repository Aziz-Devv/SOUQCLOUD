Document: Project Map / README
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: None
Related Documents: docs/MASTER_DOCUMENTATION_TOC.md
Decisions: docs/MASTER_DOCUMENTATION_TOC.md is the authoritative single source of truth for the platform documentation structure.
Open Questions: None

# Master Documentation — Project Map

Welcome to the Master Documentation for the platform. This repository contains the complete structural and architectural specifications governing the development, operation, and scaling of the ecommerce platform.

> **PRIMARY DIRECTIVE**: This documentation is the **single source of truth** for all human engineers and AI coding assistants (Gemini / Antigravity). All architectural rules, data models, module contracts, and implementation standards documented here must be adhered to without exception.

---

## Official Structural Reference

The approved structural specification for the documentation hierarchy is defined in:
* **[MASTER_DOCUMENTATION_TOC.md](MASTER_DOCUMENTATION_TOC.md)** (Version 1.0 — Approved)

---

## Documentation Layers Overview

### [Phase 00 — Product Foundation](00-product/product-vision.md)
Foundational product vision, market positioning, operating philosophy, and MVP boundaries:
* [product-vision.md](00-product/product-vision.md) — Platform identity, category, order collection model, and core value proposition.
* [product-principles.md](00-product/product-principles.md) — 10 governing product principles.
* [personas-and-use-cases.md](00-product/personas-and-use-cases.md) — Merchant, Staff, Shopper, and Operator personas.
* [glossary.md](00-product/glossary.md) — Strict domain terminology and anti-synonym rules.
* [non-goals.md](00-product/non-goals.md) — Explicit boundaries and Phase 1 non-goals.
* [phase-1-scope.md](00-product/phase-1-scope.md) — The 12-step vertical slice MVP definition (Order Submission, WhatsApp & Dashboard modes, Paddle billing).
* [roadmap.md](00-product/roadmap.md) — Strategic capability evolution across Phases 1 through 3+.

### [Phase 01 — System Architecture](01-architecture/architecture-overview.md)
High-level system topology, multi-tenancy model, security, and architectural decisions:
* [architecture-overview.md](01-architecture/architecture-overview.md) — Component topology and data flow.
* [architecture-rules.md](01-architecture/architecture-rules.md) — Hard constraints and invariants.
* [identity-and-membership-model.md](01-architecture/identity-and-membership-model.md) — Five-tier identity hierarchy.
* [multi-tenancy.md](01-architecture/multi-tenancy.md) — Logical tenant isolation and edge resolution.
* [security-authz.md](01-architecture/security-authz.md) — RBAC, session lifecycle, and Postgres Grants + RLS.
* [api-architecture.md](01-architecture/api-architecture.md) — Server Actions, Route Handlers, and Zod validation.
* [domain-model.md](01-architecture/domain-model.md) — Bounded contexts and aggregate roots.
* [error-handling.md](01-architecture/error-handling.md) — Universal platform error taxonomy.
* **Architecture Decision Records (ADRs)**:
  * [ADR-001](01-architecture/decisions/ADR-001-identity-and-membership-model.md) — Five-Tier Identity & Membership Model.
  * [ADR-002](01-architecture/decisions/ADR-002-multi-tenancy-and-tenant-resolution.md) — Multi-Tenancy & Tenant Resolution Strategy.
  * [ADR-003](01-architecture/decisions/ADR-003-schema-driven-theme-engine.md) — Schema-Driven Theme Engine & Page Lifecycle.
  * [ADR-004](01-architecture/decisions/ADR-004-phase-1-payment-strategy.md) — Phase 1 Platform Subscription Billing (Paddle) & Provider Adapter Architecture.
  * [ADR-005](01-architecture/decisions/ADR-005-commerce-state-machine-and-idempotency.md) — Storefront Order Submission, Merchant Order Lifecycle & WhatsApp Dispatch.
  * [ADR-006](01-architecture/decisions/ADR-006-hosting-and-runtime-architecture.md) — Hosting & Runtime Architecture: Next.js 16 on Cloudflare Workers via OpenNext.

### [Phase 02 — Database & Entities](02-database/schema-overview.md)
Database schema definitions, conventions, and entity specifications:
* [schema-overview.md](02-database/schema-overview.md) & [conventions.md](02-database/conventions.md)
* **Entities**: [identities.md](02-database/entities/identities.md), [users.md](02-database/entities/users.md), [memberships.md](02-database/entities/memberships.md), [merchants.md](02-database/entities/merchants.md), [stores.md](02-database/entities/stores.md), [customers.md](02-database/entities/customers.md), [products.md](02-database/entities/products.md), [themes.md](02-database/entities/themes.md), [pages.md](02-database/entities/pages.md), [media-assets.md](02-database/entities/media-assets.md), [orders.md](02-database/entities/orders.md), [notifications.md](02-database/entities/notifications.md), [billing.md](02-database/entities/billing.md), [platform-admin.md](02-database/entities/platform-admin.md), [marketplace-apps.md](02-database/entities/marketplace-apps.md).
* [migrations/README.md](02-database/migrations/README.md) — Database migration conventions and standards.

### [Phase 03 — Functional Modules](03-modules/dashboard-shell.md)
Implementation specifications and blueprints for all functional platform modules:
* **Core Vertical Slice & Phase 2 Modules (Full Spec)**: [auth.md](03-modules/auth.md), [store-creation.md](03-modules/store-creation.md), [products.md](03-modules/products.md), [media-assets.md](03-modules/media-assets.md), [theme-engine.md](03-modules/theme-engine.md), [store-builder-editor.md](03-modules/store-builder-editor.md), [publishing.md](03-modules/publishing.md), [storefront-rendering.md](03-modules/storefront-rendering.md), [checkout.md](03-modules/checkout.md) *(Order Submission & WhatsApp Integration)*, [orders.md](03-modules/orders.md), [notifications.md](03-modules/notifications.md), [dashboard-shell.md](03-modules/dashboard-shell.md), [billing-subscriptions.md](03-modules/billing-subscriptions.md) *(Paddle Platform Billing)*, [custom-domains.md](03-modules/custom-domains.md) *(Custom Domains & SSL)*.
* **Roadmap & Expansion Blueprints**: [payment-providers.md](03-modules/payment-providers.md) *(Phase 3+ Future Capability: Merchant Online Payments)*, [analytics.md](03-modules/analytics.md), [localization.md](03-modules/localization.md), [seo.md](03-modules/seo.md), [platform-admin.md](03-modules/platform-admin.md), [feature-flags.md](03-modules/feature-flags.md), [search.md](03-modules/search.md), [compliance-privacy.md](03-modules/compliance-privacy.md), [marketplace-apps.md](03-modules/marketplace-apps.md), [public-api-webhooks.md](03-modules/public-api-webhooks.md).

### [Phase 04 — UX/UI Design System](04-ux-ui/ux-principles.md)
Interaction principles, information architecture, component library, and screen specifications:
* [ux-principles.md](04-ux-ui/ux-principles.md), [information-architecture.md](04-ux-ui/information-architecture.md), [user-flows.md](04-ux-ui/user-flows.md), [ui-system.md](04-ux-ui/ui-system.md), [dashboard-ux.md](04-ux-ui/dashboard-ux.md), [storefront-ux.md](04-ux-ui/storefront-ux.md).

### [Phase 05 — Infrastructure & Cloud](05-infrastructure/nextjs-structure.md)
Cloud configuration, Next.js routing, Supabase database, and Cloudflare CDN/R2 storage:
* [nextjs-structure.md](05-infrastructure/nextjs-structure.md), [supabase-setup.md](05-infrastructure/supabase-setup.md), [cloudflare-setup.md](05-infrastructure/cloudflare-setup.md), [media-storage.md](05-infrastructure/media-storage.md), [deployment.md](05-infrastructure/deployment.md), [observability.md](05-infrastructure/observability.md).

### [Phase 06 — Process & Governance](06-process/AI_DEVELOPMENT_PROTOCOL.md)
Engineering governance, AI operating protocol, coding standards, and change workflows:
* [AI_DEVELOPMENT_PROTOCOL.md](06-process/AI_DEVELOPMENT_PROTOCOL.md), [CHANGE_WORKFLOW.md](06-process/CHANGE_WORKFLOW.md), [PROJECT_STATE.md](06-process/PROJECT_STATE.md), [CODING_STANDARDS.md](06-process/CODING_STANDARDS.md), [TESTING_STANDARDS.md](06-process/TESTING_STANDARDS.md), [DOCUMENTATION_STANDARDS.md](06-process/DOCUMENTATION_STANDARDS.md).
