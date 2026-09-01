# SOUQCLOUD — PostgreSQL & Supabase Rules

The specification under @docs/02-database/ is authoritative. Never invent tables or columns
during implementation without updating the approved documentation first.

## Tenant Integrity
Respect the ownership scopes, composite foreign keys, unique constraints, indexes, and
lifecycle constraints exactly as documented. Cross-tenant references must be structurally
prevented, not just filtered in application code.

## Money
Never use floating point for monetary values. Use the documented integer-cents
representation. Tax rates use the documented integer basis-point representation. See
@docs/01-architecture/architecture-rules.md.

## Transactions
Use database transactions for operations that must be atomic (order creation, inventory
changes, counter allocation, customer/order persistence, and any other documented
transactional boundary).

## RLS
Mandatory wherever documented. Do not bypass RLS because a query is inconvenient. If
privileged access is genuinely required, use the explicitly documented mechanism, scope it
narrowly, and validate authorization at the appropriate boundary.

## Migrations
Schema changes go through migrations only — never manual production schema mutation. Every
schema change needs: a documentation update, a migration, validation, and a rollback
consideration where applicable. Conventions: @docs/02-database/migrations/README.md

## Queries
Avoid unnecessary N+1 queries. Use explicit projections — do not fetch internal fields when
only public fields are needed.
