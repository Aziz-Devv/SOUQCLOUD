Document: Module: Store Creation
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/03-modules/auth.md, docs/02-database/entities/stores.md
Related Documents: docs/03-modules/theme-engine.md, docs/01-architecture/multi-tenancy.md
Decisions: Automated creation of merchant organization and initial store; automatic default theme and page initialization.
Open Questions: None

# Module Specification: Store Creation & Onboarding

## 1. Purpose
The Store Creation module guides a newly registered user through establishing their Merchant Organization, creating their first Store, reserving their unique subdomain handle, and seeding baseline theme configurations.

## 2. Data Model References
* `public.merchants`: Created to represent the parent organization.
* `public.memberships`: Created with role `OWNER` linking user to merchant.
* `public.stores`: Created to hold store metadata and subdomain handle.
* `public.themes`: Initialized with default baseline theme.
* `public.pages`: Seeded with default `HOME` page and layout sections.

## 3. Business Rules
1. Store handles must be lowercase alphanumeric with hyphens (e.g. `my-brand`), between 3 and 63 characters.
2. Handles must be globally unique across all stores and cannot match reserved platform slugs (e.g., `admin`, `api`, `app`, `help`, `billing`, `www`).
3. Store creation automatically bootstraps the default active theme and default home page so the store is instantly previewable.
4. Newly created stores are initialized in `DRAFT` status.

## 4. API Contract & Actions
* `checkHandleAvailability(handle: string)` &rarr; `ActionResult<{ available: boolean }>`
* `createStore(payload: CreateStoreInput)` &rarr; `ActionResult<{ storeId: string; handle: string }>`

## 5. UI/UX Reference
* Multi-step onboarding wizard:
  1. Business/Brand Name.
  2. Subdomain Handle selection (with real-time availability check).
  3. Operating Country selection (`default_country_code` ISO 3166-1 alpha-2, e.g. SA, AE, KW, EG, JO) — required for customer phone normalization.
  4. Default Currency, Language, and Store Order Mode (`DASHBOARD`, `WHATSAPP`, `BOTH`).
* Immediate transition into the customized Dashboard Shell upon completion.

## 6. Dependencies & Related Documents
* Dependencies: [auth.md](../03-modules/auth.md), [stores.md](../02-database/entities/stores.md)
* Related Documents: [theme-engine.md](../03-modules/theme-engine.md), [dashboard-shell.md](../03-modules/dashboard-shell.md)

## 7. Acceptance Criteria (Given / When / Then)
* **Given** an authenticated user without a store, **When** they submit a valid store name and an available handle, **Then** a merchant organization, owner membership, store record, default theme, and default pages are created atomically.
* **Given** an existing handle, **When** a user tries to reserve it, **Then** the system returns a `CONFLICT` error indicating the handle is taken.

## 8. Open Questions
* None.

## Implementation Status
* **Implementation Status**: Not Started
