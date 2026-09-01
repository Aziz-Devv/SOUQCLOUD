Document: ADR-001: Identity and Membership Model
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-vision.md, docs/01-architecture/identity-and-membership-model.md
Related Documents: docs/01-architecture/multi-tenancy.md, docs/02-database/entities/memberships.md
Decisions: Five-tier identity structure (Auth Identity -> User -> Membership -> Merchant Organization -> Store) adopted over flat tenancy models.
Open Questions: None

# ADR-001: Five-Tier Identity and Membership Model

## Status
Proposed (Draft Master Specification)

## Context
Ecommerce platforms must manage access across multiple organizational scopes. A naive flat model (e.g., `User -> Store`) directly associates users with individual shops. However, growing merchants frequently require:
* Multiple team members with distinct administrative roles (Owner, Admin, Staff).
* Multi-store management under a single commercial billing account.
* Single sign-on across multiple independent merchant organizations (e.g. for consultants or serial founders).

## Decision
We adopt a decoupled five-tier identity and organizational hierarchy:
1. **Auth Identity (`auth.users`)**: Supabase Auth credential and token management.
2. **User (`public.users`)**: Universal human identity profile.
3. **Membership (`public.memberships`)**: Relational association defining a user's role (`OWNER`, `ADMIN`, `STAFF`) within a specific Merchant Organization.
4. **Merchant / Organization (`public.merchants`)**: Top-level legal/commercial account owning billing subscriptions and stores.
5. **Store (`public.stores`)**: Retail shop container owning catalog, themes, orders, and customer records.

## Consequences
### Positive
* Enables seamless team member invitations without altering store or auth tables.
* Supports multi-store organizations under unified billing.
* Allows a single user login to collaborate across multiple distinct merchant organizations.

### Negative / Tradeoffs
* Requires join queries across `memberships` and `merchants` to resolve store permissions (mitigated by optimized indexing and session caching).
