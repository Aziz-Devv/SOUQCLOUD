# Master Documentation — Table of Contents

Structural Status: Approved v1.0
Documentation Status: Draft — External Review

> This Table of Contents is the approved structural source of truth (v1.0) for the platform's documentation hierarchy.
> The actual documentation content across `/docs` is currently Draft pending final external review and approval.
> AI agents and engineers read ONLY these files — never chat history — to understand the system.

Every document carries this header:

```
Document: <name>
Version: 1.0
Status: Draft | Approved
Owner: Aziz
Last Updated: <date>
Depth: Full Spec | Blueprint
Dependencies: <linked docs this one relies on>
Related Documents: <linked docs that relate to this one>
Decisions: <key decisions locked in, or "None yet">
Open Questions: <unresolved items, or "None">
```

**Depth** — *Full Spec* = implementation-ready detail, used for anything in Phase 1's
vertical slice (register → create store → theme → product → publish → storefront → cart → order submission → order → Dashboard / WhatsApp / Both). *Blueprint* = vision + constraints only, so later phases never get
blocked by today's decisions, without over-specifying things not being built yet.

---

## /docs/README.md
Project map — links to every doc below. First file any agent or human reads.

## /docs/00-product/
| File | Depth |
|---|---|
| `product-vision.md` | Full Spec |
| `product-principles.md` | Full Spec |
| `personas-and-use-cases.md` | Full Spec |
| `glossary.md` | Full Spec — locks term meanings (Merchant ≠ User, Store ≠ Theme, Page ≠ Section, Product ≠ Variant, Order ≠ Payment, Customer ≠ User) |
| `non-goals.md` | Full Spec — what the platform explicitly will NOT do, to bound "global platform" scope |
| `phase-1-scope.md` | Full Spec — exact MVP vertical-slice boundary |
| `roadmap.md` | Blueprint — Phase 0/1/2/3 direction, expected to shift |

## /docs/01-architecture/
| File | Depth |
|---|---|
| `architecture-overview.md` | Full Spec |
| `architecture-rules.md` | Full Spec — hard constraints: every tenant-owned entity must have an explicit, enforceable ownership scope appropriate to its domain (organization/merchant-level or store-level — not a blanket `store_id` on every table, since some entities like memberships and merchant settings are organization-scoped, not store-scoped); server components by default; no client-side DB access; authz always server-side |
| `identity-and-membership-model.md` | Full Spec — Auth Identity → User → Membership → Merchant/Organization → Store (not flat User → Merchant → Store), so team/staff/roles/invitations aren't blocked later |
| `multi-tenancy.md` | Full Spec |
| `security-authz.md` | Full Spec |
| `api-architecture.md` | Full Spec — Server Actions vs Route Handlers, auth, validation, error format, pagination, rate limiting, idempotency, naming |
| `domain-model.md` | Full Spec — how a request maps to a tenant via hostname (`store.yourplatform.com`), tenant resolution flow |
| `error-handling.md` | Full Spec — shared error taxonomy (Validation, Authorization, Not Found, Conflict, Rate Limit, Internal) |
| `decisions/ADR-001-*.md ...` | Full Spec — one ADR per major decision, including identity/membership model, tenancy strategy, theme schema, payment strategy, commerce state machine |
| `decisions/ADR-006-hosting-and-runtime-architecture.md` | Full Spec — Primary Application Hosting & Runtime: Next.js 16 on Cloudflare Workers via OpenNext |

## /docs/02-database/
| File | Depth |
|---|---|
| `schema-overview.md` | Full Spec |
| `conventions.md` | Full Spec |
| `entities/{identities,users,memberships,merchants,stores,customers,products,themes,pages,media-assets,orders,notifications,billing}.md` | Full Spec |
| ↳ `identities.md` must state explicitly: what lives in Supabase Auth vs. the application database, how the two are linked/synced, and what the canonical identifier is — so Gemini never builds a duplicate identity system | Full Spec |
| `entities/{platform-admin,marketplace-apps}.md` | Blueprint |
| `migrations/` | Full Spec — migration process/conventions |

## /docs/03-modules/ *(template below)*
**Full Spec:** `auth`, `store-creation`, `products`, `media-assets`, `theme-engine`, `store-builder-editor`, `publishing`, `storefront-rendering`, `checkout` *(Order Submission flow: Cart → Order Submission → Order → Outcome: Dashboard | WhatsApp | Both)*, `orders`, `notifications` *(abstraction: Email/In-app/Webhook — email channel first)*, `dashboard-shell`, `billing-subscriptions` *(Phase 1 Paddle SaaS subscription billing)*, `custom-domains` *(Phase 2 Custom Hostnames & SSL)*

**Blueprint:** `payment-providers` *(Phase 3+ Future Capability: Merchant Online Payments)*, `analytics`, `localization`, `seo`, `platform-admin`, `feature-flags`, `search`, `compliance-privacy`, `marketplace-apps`, `public-api-webhooks`

**Module template:**
```
Purpose
Data model references
Business rules
API contract
UI/UX reference
Dependencies
Related Documents
Acceptance Criteria (Given/When/Then)
Open Questions
Status: Not started | In progress | Done
```

## /docs/04-ux-ui/
| File | Depth |
|---|---|
| `ux-principles.md` | Full Spec |
| `information-architecture.md` | Full Spec |
| `user-flows.md` | Full Spec |
| `ui-system.md` | Full Spec |
| `dashboard-ux.md` | Full Spec |
| `storefront-ux.md` | Full Spec |

## /docs/05-infrastructure/
| File | Depth |
|---|---|
| `nextjs-structure.md` | Full Spec |
| `supabase-setup.md` | Full Spec |
| `cloudflare-setup.md` | Full Spec |
| `media-storage.md` | Full Spec |
| `deployment.md` | Blueprint |
| `observability.md` | Blueprint |

## /docs/06-process/
| File | Depth |
|---|---|
| `AI_DEVELOPMENT_PROTOCOL.md` | Full Spec — docs are the only source of truth (never chat history); don't invent patterns; follow change workflow; read only relevant docs per task |
| `CHANGE_WORKFLOW.md` | Full Spec — Need → Why → Update spec → Update architecture (if needed) → Implement → Test → Update PROJECT_STATE |
| `PROJECT_STATE.md` | Full Spec (living doc) — current phase, completed, in progress, blocked, next |
| `CODING_STANDARDS.md` | Full Spec |
| `TESTING_STANDARDS.md` | Full Spec |
| `DOCUMENTATION_STANDARDS.md` | Full Spec — defines the header format above and the module template fields |

---

## Locking this version
This ToC is now considered **closed for structural debate**. Any further additions
(e.g. a module nobody thought of) get appended as a single Blueprint line item —
no further rounds of restructuring the whole tree.

**Status: Approved v1.0.** Save this file in the repo as `docs/MASTER_DOCUMENTATION_TOC.md`,
and have `docs/README.md` reference it as the official structural reference.

## Current Lifecycle State

* Documentation scaffold completed.
* Master Documentation authored across all 7 layers.
* Final correction passes completed.
* Current status: External review pending.
* Next step: Final approval, then implementation.
