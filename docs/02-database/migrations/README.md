Document: Database Migration Conventions
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/schema-overview.md, docs/02-database/conventions.md
Related Documents: docs/05-infrastructure/supabase-setup.md, docs/06-process/CHANGE_WORKFLOW.md
Decisions: Migration naming standard (YYYYMMDDHHMMSS_name.sql); forward-only migrations; idempotent DDL statements; Supabase CLI migration tooling.
Open Questions: None

# Database Migration Conventions & Process

## 1. Purpose & Scope

This document specifies the database migration process, versioning rules, and deployment standards for managing schema evolution across development, staging, and production environments.

---

## 2. Migration File Conventions

* **Directory Location**: All physical SQL migration files reside in `supabase/migrations/`.
* **File Naming Pattern**: `YYYYMMDDHHMMSS_<descriptive_snake_case_name>.sql`
  * Example: `20260823000001_create_identity_and_merchant_tables.sql`
  * Example: `20260823000002_create_catalog_and_variants.sql`
* **Linear Versioning**: Migrations are strictly sequential and immutable once applied to shared environments.

---

## 3. Authoring & Execution Standards

1. **Forward-Only Migrations**: In production environments, migrations are forward-only. Rollbacks are performed by creating a new forward migration that reverses the changes.
2. **Idempotency**: DDL statements should use idempotent clauses where possible:
   * `CREATE TABLE IF NOT EXISTS ...`
   * `CREATE INDEX IF NOT EXISTS ...`
   * `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN ... END $$;`
3. **Transaction Safety**: Every migration executes within an explicit single transaction (`BEGIN; ... COMMIT;`). If any statement fails, the entire migration aborts and rolls back.
4. **Zero Downtime Migrations**:
   * Add new nullable columns or default-backed columns before updating application code.
   * Deprecate and remove old columns in a subsequent deployment phase.

---

## 4. Tooling & Local Workflow

* Local schema development uses the **Supabase CLI**:
  ```bash
  supabase migration new <migration_name>
  supabase db reset
  supabase db push
  ```
* Schema migrations must be accompanied by updated TypeScript database types generated via `supabase gen types typescript`.
